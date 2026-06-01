const prisma = require('../config/db');
const { asyncHandler } = require('../middlewares/errorHandler');
const { getWeekRange, getMonthRange, getYearRange, parseLocalDateOnly, startOfDay, endOfDay } = require('../utils/dateHelper');
const { buildTrend, buildExpenseBreakdown } = require('../utils/financeHelper');

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
    const isExpenseCat = (t) => {
        const ty = normalizeType(t.type);
        return ty === 'keluar' || ty === 'pengeluaran' || ty === 'expense';
    };

    let pemasukan = 0;
    let pengeluaran = 0;
    let keuntunganBersih = 0;
    for (const t of tx) {
        const amt = Number(t.amount) || 0;
        const ty = normalizeType(t.type);

        if (ty === 'masuk' || ty === 'pemasukan' || ty === 'income') {
            pemasukan += amt;
            keuntunganBersih += amt;
        }
        if (isExpenseCat(t)) {
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

    // --- komparasi periode sebelumnya ---
    const computeChange = (curr, prev) => {
        if (prev === 0) return curr > 0 ? { change: 100, previous: 0 } : { change: 0, previous: 0 };
        return { change: Math.round(((curr - prev) / prev) * 1000) / 10, previous: prev };
    };

    let prevRange = null;
    if (effectivePeriod === 'week') {
        const prevStart = new Date(range.start);
        prevStart.setDate(range.start.getDate() - 7);
        const prevEnd = new Date(prevStart);
        prevEnd.setDate(prevStart.getDate() + 6);
        prevRange = { start: startOfDay(prevStart), end: endOfDay(prevEnd) };
    } else if (effectivePeriod === 'month') {
        const prevStart = new Date(range.start);
        prevStart.setMonth(range.start.getMonth() - 1);
        const prevEnd = new Date(range.start);
        prevEnd.setDate(0);
        prevRange = { start: startOfDay(prevStart), end: endOfDay(prevEnd) };
    } else if (effectivePeriod === 'year') {
        const prevStart = new Date(range.start);
        prevStart.setFullYear(range.start.getFullYear() - 1);
        const prevEnd = new Date(range.start);
        prevEnd.setDate(0);
        prevRange = { start: startOfDay(prevStart), end: endOfDay(prevEnd) };
    }

    let comparison = null;
    if (prevRange) {
        const prevTx = await prisma.transactions.findMany({
            where: { organizationId: req.user.organizationId, createdAt: { gte: prevRange.start, lte: prevRange.end } },
        });

        let prevPemasukan = 0, prevPengeluaran = 0, prevKeuntunganBersih = 0;
        for (const t of prevTx) {
            const amt = Number(t.amount) || 0;
            const ty = String(t.type || '').toLowerCase().trim();
            if (ty === 'masuk' || ty === 'pemasukan' || ty === 'income') {
                prevPemasukan += amt;
                prevKeuntunganBersih += amt;
            }
            if (ty === 'keluar' || ty === 'pengeluaran' || ty === 'expense') {
                prevPengeluaran += amt;
                prevKeuntunganBersih -= amt;
            }
        }

        comparison = {
            pemasukan: computeChange(pemasukan, prevPemasukan),
            pengeluaran: computeChange(pengeluaran, prevPengeluaran),
            keuntunganBersih: computeChange(keuntunganBersih, prevKeuntunganBersih),
        };
    }

    res.json({
        requestedPeriod: period, effectivePeriod, isFallback: false,
        range: { start: range.start.toISOString(), end: range.end.toISOString() },
        totals: { pemasukan, pengeluaran, keuntunganBersih },
        comparison, projection7d, trend, expenseBreakdown: breakdown, availability, transactionCount: tx.length,
    });
});