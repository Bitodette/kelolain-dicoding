const prisma = require('../config/db');
const { asyncHandler } = require('../middlewares/errorHandler');
const { getWeekRange, getMonthRange, getYearRange, parseLocalDateOnly, startOfDay, endOfDay } = require('../utils/dateHelper');
const { getCartFromItems, computeCogsFromCart, buildTrend, buildExpenseBreakdown } = require('../utils/financeHelper');

async function getAvailability(prismaClient, organizationId) {
    const now = new Date();
    const ranges = {
        week: getWeekRange(now),
        month: getMonthRange(now),
        year: getYearRange(now),
    };

    const [weekCount, monthCount, yearCount, allCount] = await Promise.all([
        prismaClient.transactions.count({ where: { organizationId, createdAt: { gte: ranges.week.start, lte: ranges.week.end } } }),
        prismaClient.transactions.count({ where: { organizationId, createdAt: { gte: ranges.month.start, lte: ranges.month.end } } }),
        prismaClient.transactions.count({ where: { organizationId, createdAt: { gte: ranges.year.start, lte: ranges.year.end } } }),
        prismaClient.transactions.count({ where: { organizationId } }),
    ]);

    return {
        week: { count: weekCount },
        month: { count: monthCount },
        year: { count: yearCount },
        all: { count: allCount },
    };
}

exports.getFinanceOverview = asyncHandler(async (req, res) => {
    const now = new Date();
    const requestedPeriod = String(req.query.period || 'month').toLowerCase();
    const availability = await getAvailability(prisma, req.user.organizationId);

    const period = ['week', 'month', 'year', 'all', 'custom'].includes(requestedPeriod) ? requestedPeriod : 'month';
    let effectivePeriod = period;

    let range;
    if (effectivePeriod === 'week') range = getWeekRange(now);
    else if (effectivePeriod === 'month') range = getMonthRange(now);
    else if (effectivePeriod === 'year') range = getYearRange(now);
    else if (effectivePeriod === 'custom') {
        const startQ = req.query.start;
        const endQ = req.query.end;
        const startDate = parseLocalDateOnly(startQ) || (startQ ? new Date(startQ) : null);
        const endDate = parseLocalDateOnly(endQ) || (endQ ? new Date(endQ) : null);
        if (!startDate || !endDate) return res.status(400).json({ error: 'Query start dan end wajib untuk period=custom' });
        range = { start: startOfDay(startDate), end: endOfDay(endDate) };
    } else {
        const min = await prisma.transactions.findFirst({ where: { organizationId: req.user.organizationId }, orderBy: { createdAt: 'asc' } });
        const max = await prisma.transactions.findFirst({ where: { organizationId: req.user.organizationId }, orderBy: { createdAt: 'desc' } });
        if (!min || !max) range = getMonthRange(now);
        else range = { start: startOfDay(new Date(min.createdAt)), end: endOfDay(new Date(max.createdAt)) };
    }

    const tx = await prisma.transactions.findMany({
        where: { organizationId: req.user.organizationId, createdAt: { gte: range.start, lte: range.end } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const normalizeType = (value) => String(value || '').toLowerCase().trim();
    const isIncome = (t) => {
        const ty = normalizeType(t.type);
        return ty === 'masuk' || ty === 'pemasukan' || ty === 'income';
    };
    // hitung cogs kalo transaksi lama belum punya data hpp
    const needCogsTx = tx.filter((t) => isIncome(t) && (Number(t.cogs) || 0) <= 0);
    const productIdsNeeded = new Set();
    for (const t of needCogsTx) {
        const cart = getCartFromItems(t.items);
        for (const line of cart) {
            const pid = Number(line?.productId);
            if (Number.isFinite(pid)) productIdsNeeded.add(pid);
        }
    }

    const products = productIdsNeeded.size
        ? await prisma.product.findMany({ where: { id: { in: Array.from(productIdsNeeded) }, organizationId: req.user.organizationId }, select: { id: true, costPrice: true } })
        : [];
    const productCostById = new Map(products.map((p) => [p.id, p.costPrice]));

    for (const t of needCogsTx) {
        const cart = getCartFromItems(t.items);
        if (cart.length === 0) continue;
        t.__computedCogs = computeCogsFromCart(cart, productCostById);
    }

    let pemasukan = 0;
    let pengeluaran = 0;
    let keuntunganBersih = 0;
    for (const t of tx) {
        const amt = Number(t.amount) || 0;
        const ty = normalizeType(t.type);

        if (ty === 'masuk' || ty === 'pemasukan' || ty === 'income') {
            pemasukan += amt;
            const usedCogs = (Number(t.cogs) || 0) > 0 ? (Number(t.cogs) || 0) : (Number(t.__computedCogs) || 0);
            keuntunganBersih += amt - usedCogs;
        }
        if (ty === 'keluar' || ty === 'pengeluaran' || ty === 'expense') {
            pengeluaran += amt;
            keuntunganBersih -= amt;
        }
    }

    const trend = buildTrend({ period: effectivePeriod, start: range.start, end: range.end, transactions: tx });
    const breakdown = buildExpenseBreakdown(tx);

    const last7Start = new Date(now);
    last7Start.setDate(now.getDate() - 6);
    const last7 = await prisma.transactions.findMany({
        where: { organizationId: req.user.organizationId, createdAt: { gte: startOfDay(last7Start), lte: endOfDay(now) } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    let net7 = 0;
    for (const t of last7) {
        const amt = Number(t.amount) || 0;
        const ty = String(t.type || '').toLowerCase().trim();
        if (ty === 'masuk' || ty === 'pemasukan' || ty === 'income') net7 += amt;
        if (ty === 'keluar' || ty === 'pengeluaran' || ty === 'expense') {
            net7 -= amt;
        }
    }
    const projection7d = last7.length >= 2 ? Math.round(net7) : null;

    res.json({
        requestedPeriod: period, effectivePeriod, isFallback: false,
        range: { start: range.start.toISOString(), end: range.end.toISOString() },
        totals: { pemasukan, pengeluaran, keuntunganBersih },
        projection7d, trend, expenseBreakdown: breakdown, availability, transactionCount: tx.length,
    });
});