const prisma = require('../config/db');
const { asyncHandler } = require('../middlewares/errorHandler');
const { getWeekRange, getMonthRange, getYearRange, parseLocalDateOnly, startOfDay, endOfDay } = require('../utils/dateHelper');
const { buildTrend, buildExpenseBreakdown } = require('../utils/financeHelper');
const { isIncome, isExpense, normalizeType } = require('../utils/txType');
const INCOME_VARIANTS = ['masuk', 'pemasukan', 'income'];
const EXPENSE_VARIANTS = ['keluar', 'pengeluaran', 'expense'];

const financeCache = new Map();
const CACHE_TTL = 30000;

function getCacheKey(orgId, period, start, end) {
    return `finance:${orgId}:${period}:${start.getTime()}:${end.getTime()}`;
}

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

async function getAggregates(prismaClient, organizationId, range) {
    const aggregates = await prismaClient.transactions.groupBy({
        by: ['type'],
        where: { organizationId, createdAt: { gte: range.start, lte: range.end } },
        _sum: { amount: true },
    });

    let pemasukan = 0;
    let pengeluaran = 0;
    for (const agg of aggregates) {
        const amt = Number(agg._sum.amount) || 0;
        const ty = normalizeType(agg.type);
        if (INCOME_VARIANTS.includes(ty)) pemasukan += amt;
        if (EXPENSE_VARIANTS.includes(ty)) pengeluaran += amt;
    }
    return { pemasukan, pengeluaran, keuntunganBersih: pemasukan - pengeluaran };
}

exports.getFinanceOverview = asyncHandler(async (req, res) => {
    const now = new Date();
    const requestedPeriod = String(req.query.period || 'month').toLowerCase();
    const orgId = req.user.organizationId;

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
        const min = await prisma.transactions.findFirst({ where: { organizationId: orgId }, orderBy: { createdAt: 'asc' } });
        const max = await prisma.transactions.findFirst({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' } });
        if (!min || !max) range = getMonthRange(now);
        else range = { start: startOfDay(new Date(min.createdAt)), end: endOfDay(new Date(max.createdAt)) };
    }

    const cacheKey = getCacheKey(orgId, effectivePeriod, range.start, range.end);
    const cached = financeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
    }

    const [availability, aggregates, tx] = await Promise.all([
        getAvailability(prisma, orgId),
        getAggregates(prisma, orgId, range),
        prisma.transactions.findMany({
            where: { organizationId: orgId, createdAt: { gte: range.start, lte: range.end } },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            take: 1000,
        }),
    ]);

    const { pemasukan, pengeluaran, keuntunganBersih } = aggregates;

    const trend = buildTrend({ period: effectivePeriod, start: range.start, end: range.end, transactions: tx });
    const breakdown = buildExpenseBreakdown(tx);

    const last7Start = new Date(now);
    last7Start.setDate(now.getDate() - 6);
    const last7 = tx.filter((t) => {
        const d = new Date(t.createdAt);
        return d >= startOfDay(last7Start) && d <= endOfDay(now);
    });
    let net7 = 0;
    for (const t of last7) {
        const amt = Number(t.amount) || 0;
        if (isIncome(t)) net7 += amt;
        if (isExpense(t)) net7 -= amt;
    }
    const projection7d = last7.length >= 2 ? Math.round(net7) : null;

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
        const prevAggregates = await prisma.transactions.groupBy({
            by: ['type'],
            where: { organizationId: orgId, createdAt: { gte: prevRange.start, lte: prevRange.end } },
            _sum: { amount: true },
        });

        let prevPemasukan = 0, prevPengeluaran = 0;
        for (const agg of prevAggregates) {
            const amt = Number(agg._sum.amount) || 0;
            const ty = normalizeType(agg.type);
            if (INCOME_VARIANTS.includes(ty)) prevPemasukan += amt;
            if (EXPENSE_VARIANTS.includes(ty)) prevPengeluaran += amt;
        }
        const prevKeuntunganBersih = prevPemasukan - prevPengeluaran;

        comparison = {
            pemasukan: computeChange(pemasukan, prevPemasukan),
            pengeluaran: computeChange(pengeluaran, prevPengeluaran),
            keuntunganBersih: computeChange(keuntunganBersih, prevKeuntunganBersih),
        };
    }

    const result = {
        requestedPeriod: period, effectivePeriod, isFallback: false,
        range: { start: range.start.toISOString(), end: range.end.toISOString() },
        totals: { pemasukan, pengeluaran, keuntunganBersih },
        comparison, projection7d, trend, expenseBreakdown: breakdown, availability, transactionCount: tx.length,
    };

    financeCache.set(cacheKey, { data: result, timestamp: Date.now() });
    res.json(result);
});