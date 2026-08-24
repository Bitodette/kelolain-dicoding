const prisma = require('../config/db');
const { asyncHandler } = require('../middlewares/errorHandler');
const { getWeekRange, startOfDay, endOfDay } = require('../utils/dateHelper');
const { isIncome, isExpense, normalizeType } = require('../utils/txType');

const LOW_STOCK_THRESHOLD = 5;

const dashboardCache = new Map();
const CACHE_TTL = 30000;
const INCOME_VARIANTS = ['masuk', 'pemasukan', 'income'];
const EXPENSE_VARIANTS = ['keluar', 'pengeluaran', 'expense'];

async function getWeekAggregates(prismaClient, orgId, range) {
    const aggregates = await prismaClient.transactions.groupBy({
        by: ['type'],
        where: { organizationId: orgId, createdAt: { gte: range.start, lte: range.end } },
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

async function getDailyTrend(prismaClient, orgId, range) {
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const buckets = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(range.start);
        d.setDate(range.start.getDate() + i);
        return {
            label: dayNames[d.getDay()],
            pemasukan: 0,
            pengeluaran: 0,
            keuntunganBersih: 0,
        };
    });
    const bucketByKey = new Map(
        Array.from({ length: 7 }, (_, i) => {
            const d = new Date(range.start);
            d.setDate(range.start.getDate() + i);
            return [`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, buckets[i]];
        })
    );

    const tx = await prismaClient.transactions.findMany({
        where: { organizationId: orgId, createdAt: { gte: range.start, lte: range.end } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 500,
    });

    for (const t of tx) {
        const amt = Number(t.amount) || 0;
        const dt = new Date(t.createdAt);
        const key = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
        const b = bucketByKey.get(key);

        if (isIncome(t)) {
            if (b) { b.pemasukan += amt; b.keuntunganBersih += amt; }
        }
        if (isExpense(t)) {
            if (b) { b.pengeluaran += amt; b.keuntunganBersih -= amt; }
        }
    }
    return buckets;
}

async function getLowStockWithEstimation(prismaClient, orgId, now) {
    const lowStockProducts = await prismaClient.product.findMany({
        where: { organizationId: orgId, stock: { lte: LOW_STOCK_THRESHOLD } },
        orderBy: { stock: 'asc' },
        take: 10,
    });

    const lowStockItems = lowStockProducts.map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        threshold: LOW_STOCK_THRESHOLD,
        est: null,
    }));

    if (lowStockItems.length === 0) return lowStockItems;

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);

    const [recentTxs, allProducts] = await Promise.all([
        prismaClient.transactions.findMany({
            where: {
                organizationId: orgId,
                type: 'Masuk',
                createdAt: { gte: startOfDay(sevenDaysAgo) },
            },
            take: 200,
        }),
        prismaClient.product.findMany({
            where: { organizationId: orgId },
            select: { name: true, stock: true },
        }),
    ]);

    const dayTxsMap = new Map();
    for (const tx of recentTxs) {
        if (!tx.items) continue;
        const txDate = new Date(tx.createdAt);
        txDate.setHours(0, 0, 0, 0);
        const key = txDate.getTime();
        if (!dayTxsMap.has(key)) dayTxsMap.set(key, []);
        dayTxsMap.get(key).push(tx);
    }

    const sortedDays = Array.from(dayTxsMap.keys()).sort((a, b) => a - b);
    const recent3Days = sortedDays.slice(-3);

    const demandMap = {};
    for (const p of allProducts) {
        demandMap[p.name] = { demand: [0, 0, 0], stock: p.stock };
    }

    for (let idx = 0; idx < recent3Days.length; idx++) {
        const dayTxs = dayTxsMap.get(recent3Days[idx]);
        if (!dayTxs) continue;
        for (const tx of dayTxs) {
            if (!tx.items) continue;
            const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
            const cart = items.cart || [];
            for (const item of cart) {
                if (demandMap[item.name]) {
                    demandMap[item.name].demand[idx] += (item.qty || 0);
                }
            }
        }
    }

    for (const li of lowStockItems) {
        const d = demandMap[li.name];
        if (d) {
            const totalDemand = d.demand.reduce((s, v) => s + v, 0);
            const avgDaily = totalDemand / 3 || 0;
            if (avgDaily > 0) {
                li.est = Math.max(1, Math.ceil(d.stock / avgDaily));
            }
        }
    }
    return lowStockItems;
}

exports.getDashboardSummary = asyncHandler(async (req, res) => {
    const orgId = req.user.organizationId;
    const now = new Date();
    const range = getWeekRange(now);

    const cacheKey = `dashboard:${orgId}:${range.start.getTime()}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
    }

    const [aggregates, trend, lowStockItems, totalProductCount, transactionCount] = await Promise.all([
        getWeekAggregates(prisma, orgId, range),
        getDailyTrend(prisma, orgId, range),
        getLowStockWithEstimation(prisma, orgId, now),
        prisma.product.count({ where: { organizationId: orgId } }),
        prisma.transactions.count({ where: { organizationId: orgId, createdAt: { gte: range.start, lte: range.end } } }),
    ]);

    const result = {
        weekSummary: {
            pemasukan: aggregates.pemasukan,
            pengeluaran: aggregates.pengeluaran,
            keuntunganBersih: aggregates.keuntunganBersih,
            transactionCount,
            trend,
        },
        lowStockItems,
        productCount: totalProductCount,
    };

    dashboardCache.set(cacheKey, { data: result, timestamp: Date.now() });
    res.json(result);
});
