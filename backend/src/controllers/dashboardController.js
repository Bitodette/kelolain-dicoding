const prisma = require('../config/db');
const { asyncHandler } = require('../middlewares/errorHandler');
const { getWeekRange, startOfDay, endOfDay } = require('../utils/dateHelper');

const LOW_STOCK_THRESHOLD = 5;

exports.getDashboardSummary = asyncHandler(async (req, res) => {
    const orgId = req.user.organizationId;
    const now = new Date();
    const range = getWeekRange(now);

    const [weekTransactions, lowStockProducts, totalProductCount] = await Promise.all([
        prisma.transactions.findMany({
            where: { organizationId: orgId, createdAt: { gte: range.start, lte: range.end } },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        }),
        prisma.product.findMany({
            where: { organizationId: orgId, stock: { lte: LOW_STOCK_THRESHOLD } },
            orderBy: { stock: 'asc' },
            take: 10,
        }),
        prisma.product.count({ where: { organizationId: orgId } }),
    ]);

    let pemasukan = 0;
    let pengeluaran = 0;
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

    for (const t of weekTransactions) {
        const amt = Number(t.amount) || 0;
        const ty = String(t.type || '').toLowerCase().trim();
        const dt = new Date(t.createdAt);
        const key = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
        const b = bucketByKey.get(key);

        if (ty === 'masuk' || ty === 'pemasukan' || ty === 'income') {
            pemasukan += amt;
            if (b) { b.pemasukan += amt; b.keuntunganBersih += amt; }
        }
        if (ty === 'keluar' || ty === 'pengeluaran' || ty === 'expense') {
            pengeluaran += amt;
            if (b) { b.pengeluaran += amt; b.keuntunganBersih -= amt; }
        }
    }

    const lowStockItems = lowStockProducts.map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        threshold: LOW_STOCK_THRESHOLD,
        est: null,
    }));

    if (lowStockItems.length > 0) {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 6);

        const [recentTxs, allProducts] = await Promise.all([
            prisma.transactions.findMany({
                where: {
                    organizationId: orgId,
                    type: 'Masuk',
                    createdAt: { gte: startOfDay(sevenDaysAgo) },
                },
            }),
            prisma.product.findMany({ where: { organizationId: orgId } }),
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
    }

    res.json({
        weekSummary: {
            pemasukan,
            pengeluaran,
            keuntunganBersih: pemasukan - pengeluaran,
            transactionCount: weekTransactions.length,
            trend: buckets,
        },
        lowStockItems,
        productCount: totalProductCount,
    });
});
