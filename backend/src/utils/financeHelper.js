const { formatIdMonth, formatIdShortDate } = require('./dateHelper');

function buildTrend({ period, start, end, transactions }) {
    const normalizeType = (value) => String(value || '').toLowerCase().trim();
    const isIncome = (t) => {
        const ty = normalizeType(t.type);
        return ty === 'masuk' || ty === 'pemasukan' || ty === 'income';
    };
    const isExpense = (t) => {
        const ty = normalizeType(t.type);
        return ty === 'keluar' || ty === 'pengeluaran' || ty === 'expense';
    };
    const isRestock = (t) => {
        const cat = String(t.category || '').toLowerCase();
        const label = String(t.label || '').toLowerCase();
        return cat.includes('restock') || label.includes('restock');
    };

    const add = (acc, key, amount) => {
        acc[key] = (acc[key] || 0) + (Number(amount) || 0);
        return acc;
    };

    const getCogs = (t) => {
        const direct = Number(t?.cogs);
        if (Number.isFinite(direct) && direct > 0) return direct;
        const computed = t?.__computedCogs;
        const computedNum = Number(computed);
        return Number.isFinite(computedNum) ? computedNum : 0;
    };

    const getProfitDelta = (t) => {
        const amt = Number(t?.amount) || 0;
        if (isIncome(t)) return amt - getCogs(t);
        if (isExpense(t)) return isRestock(t) ? 0 : -amt;
        return 0;
    };

    if (period === 'week') {
        const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        const buckets = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return {
                key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
                label: dayNames[d.getDay()],
                pemasukan: 0,
                pengeluaran: 0,
                keuntunganBersih: 0,
            };
        });
        const bucketByKey = new Map(buckets.map((b) => [b.key, b]));
        for (const t of transactions) {
            const dt = new Date(t.createdAt);
            const key = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
            const b = bucketByKey.get(key);
            if (!b) continue;
            if (isIncome(t)) add(b, 'pemasukan', t.amount);
            if (isExpense(t)) add(b, 'pengeluaran', t.amount);
            add(b, 'keuntunganBersih', getProfitDelta(t));
        }
        return buckets;
    }

    if (period === 'month') {
        const lastDay = new Date(end).getDate();
        const weekCount = Math.ceil(lastDay / 7);
        const buckets = Array.from({ length: weekCount }, (_, idx) => ({
            key: String(idx + 1),
            label: `M${idx + 1}`,
            pemasukan: 0,
            pengeluaran: 0,
            keuntunganBersih: 0,
        }));
        for (const t of transactions) {
            const dt = new Date(t.createdAt);
            const weekIndex = Math.floor((dt.getDate() - 1) / 7);
            const b = buckets[weekIndex];
            if (!b) continue;
            if (isIncome(t)) add(b, 'pemasukan', t.amount);
            if (isExpense(t)) add(b, 'pengeluaran', t.amount);
            add(b, 'keuntunganBersih', getProfitDelta(t));
        }
        return buckets;
    }

    if (period === 'year') {
        const buckets = Array.from({ length: 12 }, (_, idx) => ({
            key: String(idx),
            label: formatIdMonth(new Date(start.getFullYear(), idx, 1)),
            pemasukan: 0,
            pengeluaran: 0,
            keuntunganBersih: 0,
        }));
        for (const t of transactions) {
            const dt = new Date(t.createdAt);
            const b = buckets[dt.getMonth()];
            if (!b) continue;
            if (isIncome(t)) add(b, 'pemasukan', t.amount);
            if (isExpense(t)) add(b, 'pengeluaran', t.amount);
            add(b, 'keuntunganBersih', getProfitDelta(t));
        }
        return buckets;
    }

    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    if (days <= 14) {
        const buckets = Array.from({ length: days + 1 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return {
                key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
                label: formatIdShortDate(d),
                pemasukan: 0,
                pengeluaran: 0,
                keuntunganBersih: 0,
            };
        });
        const bucketByKey = new Map(buckets.map((b) => [b.key, b]));
        for (const t of transactions) {
            const dt = new Date(t.createdAt);
            const key = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
            const b = bucketByKey.get(key);
            if (!b) continue;
            if (isIncome(t)) add(b, 'pemasukan', t.amount);
            if (isExpense(t)) add(b, 'pengeluaran', t.amount);
            add(b, 'keuntunganBersih', getProfitDelta(t));
        }
        return buckets;
    }

    if (days <= 120) {
        const weekCount = Math.ceil(days / 7);
        const buckets = Array.from({ length: weekCount }, (_, idx) => ({
            key: String(idx + 1),
            label: `W${idx + 1}`,
            pemasukan: 0,
            pengeluaran: 0,
            keuntunganBersih: 0,
        }));
        for (const t of transactions) {
            const dt = new Date(t.createdAt);
            const offsetDays = Math.floor((dt.getTime() - start.getTime()) / 86400000);
            const weekIndex = Math.floor(offsetDays / 7);
            const b = buckets[weekIndex];
            if (!b) continue;
            if (isIncome(t)) add(b, 'pemasukan', t.amount);
            if (isExpense(t)) add(b, 'pengeluaran', t.amount);
            add(b, 'keuntunganBersih', getProfitDelta(t));
        }
        return buckets;
    }

    const buckets = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= end) {
        buckets.push({
            key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
            label: `${formatIdMonth(cursor)} ${cursor.getFullYear()}`,
            pemasukan: 0,
            pengeluaran: 0,
            keuntunganBersih: 0,
        });
        cursor.setMonth(cursor.getMonth() + 1);
    }
    const bucketByKey = new Map(buckets.map((b) => [b.key, b]));
    for (const t of transactions) {
        const dt = new Date(t.createdAt);
        const key = `${dt.getFullYear()}-${dt.getMonth()}`;
        const b = bucketByKey.get(key);
        if (!b) continue;
        if (isIncome(t)) add(b, 'pemasukan', t.amount);
        if (isExpense(t)) add(b, 'pengeluaran', t.amount);
        add(b, 'keuntunganBersih', getProfitDelta(t));
    }
    return buckets;
}

function safeParseJson(value) {
    if (!value) return null;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return null;
    try { return JSON.parse(value); } catch { return null; }
}

function getCartFromItems(items) {
    const obj = safeParseJson(items);
    const cart = obj?.cart;
    return Array.isArray(cart) ? cart : [];
}

function computeCogsFromCart(cart, productCostById) {
    let cogs = 0;
    for (const line of cart) {
        const qty = Number(line?.qty) || 0;
        if (qty <= 0) continue;
        const costFromLine = Number(line?.costPrice);
        const pid = Number(line?.productId);
        const fallback = Number.isFinite(pid) ? Number(productCostById?.get(pid)) : NaN;
        const unitCost = Number.isFinite(costFromLine) ? costFromLine : (Number.isFinite(fallback) ? fallback : 0);
        cogs += unitCost * qty;
    }
    return cogs;
}

function buildExpenseBreakdown(transactions) {
    const isRestock = (t) => {
        const cat = String(t.category || '').toLowerCase();
        const label = String(t.label || '').toLowerCase();
        return cat.includes('restock') || label.includes('restock');
    };
    const expenses = transactions.filter((t) => {
        const ty = String(t.type || '').toLowerCase().trim();
        return (ty === 'keluar' || ty === 'pengeluaran' || ty === 'expense') && !isRestock(t);
    });
    if (expenses.length === 0) return [];

    const sums = new Map();
    let total = 0;
    for (const t of expenses) {
        const cat = t.category || 'Lainnya';
        const amt = Number(t.amount) || 0;
        total += amt;
        sums.set(cat, (sums.get(cat) || 0) + amt);
    }
    if (total <= 0) return [];

    const sorted = Array.from(sums.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);

    const top = sorted.slice(0, 3);
    const rest = sorted.slice(3);
    const restAmount = rest.reduce((s, x) => s + x.amount, 0);
    if (restAmount > 0) top.push({ name: 'Lainnya', amount: restAmount });

    const percents = top.map((x) => ({
        name: x.name,
        value: Math.round((x.amount / total) * 100),
    }));
    const sumPercent = percents.reduce((s, x) => s + x.value, 0);
    if (percents.length > 0 && sumPercent !== 100) {
        percents[0].value = Math.max(0, percents[0].value + (100 - sumPercent));
    }
    return percents;
}

module.exports = {
    buildTrend,
    safeParseJson,
    getCartFromItems,
    computeCogsFromCart,
    buildExpenseBreakdown
};