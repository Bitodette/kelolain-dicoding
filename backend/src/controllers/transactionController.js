const prisma = require('../config/db');
const { asyncHandler } = require('../middlewares/errorHandler');
const { parseLocalDateOnly, startOfDay, endOfDay } = require('../utils/dateHelper');
const { getCartFromItems, computeCogsFromCart } = require('../utils/financeHelper');

const getStatusFromStock = (stock) => {
    if (stock <= 0) return 'Habis';
    if (stock <= 5) return 'Menipis';
    return 'Aman';
};

// fifo: ambil batch paling lama dulu buat hitung hpp
async function computeFifoCogsAndUpdateBatches(cart, orgId) {
    const normalizedCart = cart
        .map((line) => ({
            productId: Number(line?.productId),
            qty: Number(line?.qty) || 0,
            costPrice: Number(line?.costPrice),
        }))
        .filter((line) => Number.isFinite(line.productId) && line.qty > 0);

    if (normalizedCart.length === 0) return 0;

    const productIds = Array.from(new Set(normalizedCart.map((line) => line.productId)));
    const products = await prisma.product.findMany({
        where: { id: { in: productIds }, organizationId: orgId },
        select: { id: true, costPrice: true, stock: true },
    });
    const productInfoById = new Map(products.map((product) => [product.id, product]));

    const batches = await prisma.productBatch.findMany({
        where: { productId: { in: productIds }, currentQty: { gt: 0 }, product: { organizationId: orgId } },
        orderBy: [{ productId: 'asc' }, { createdAt: 'asc' }],
    });

    const batchesByProduct = new Map();
    for (const batch of batches) {
        if (!batchesByProduct.has(batch.productId)) batchesByProduct.set(batch.productId, []);
        batchesByProduct.get(batch.productId).push({ ...batch });
    }

    let cogs = 0;
    const batchUpdates = [];
    const soldByProduct = new Map();

    for (const line of normalizedCart) {
        const productBatches = batchesByProduct.get(line.productId) || [];
        let qtyLeft = line.qty;
        const totalAvailable = productBatches.reduce((sum, batch) => sum + (batch.currentQty || 0), 0);
        const productInfo = productInfoById.get(line.productId);
        const fallbackAvailable = Math.max(0, (productInfo?.stock || 0) - totalAvailable);

        if (totalAvailable + fallbackAvailable < qtyLeft) {
            throw new Error(`Stok tidak cukup untuk produk id ${line.productId}`);
        }

        for (const batch of productBatches) {
            if (qtyLeft <= 0) break;
            const available = Number(batch.currentQty) || 0;
            if (available <= 0) continue;
            const take = Math.min(available, qtyLeft);
            batch.currentQty = available - take;
            qtyLeft -= take;
            cogs += take * Number(batch.costPrice);
            batchUpdates.push({ id: batch.id, currentQty: batch.currentQty });
        }

        if (qtyLeft > 0 && fallbackAvailable > 0) {
            const fallbackTake = Math.min(fallbackAvailable, qtyLeft);
            cogs += fallbackTake * Number(productInfo?.costPrice || 0);
            qtyLeft -= fallbackTake;
        }

        soldByProduct.set(line.productId, (soldByProduct.get(line.productId) || 0) + line.qty);
    }

    await prisma.$transaction(async (tx) => {
        for (const update of batchUpdates) {
            await tx.productBatch.update({
                where: { id: update.id },
                data: { currentQty: update.currentQty },
            });
        }

        const productIdsToUpdate = Array.from(soldByProduct.entries());
        if (productIdsToUpdate.length > 0) {
            const products = await tx.product.findMany({
                where: { id: { in: productIdsToUpdate.map(([id]) => id) }, organizationId: orgId },
                select: { id: true, stock: true },
            });
            for (const product of products) {
                const soldQty = soldByProduct.get(product.id) || 0;
                const newStock = Math.max(0, Number(product.stock || 0) - soldQty);
                await tx.product.update({
                    where: { id: product.id },
                    data: { stock: newStock, status: getStatusFromStock(newStock) },
                });
            }
        }
    });

    return cogs;
}

const normalizeTypeWrite = (value) => {
    const ty = String(value || '').toLowerCase().trim();
    if (['pemasukan', 'income', 'masuk'].includes(ty)) return 'Masuk';
    if (['pengeluaran', 'expense', 'keluar'].includes(ty)) return 'Keluar';
    return value;
};

exports.getTransactions = asyncHandler(async (req, res) => {
    const { start, end, limit } = req.query;
    const page = req.query.page ? Math.max(1, Number(req.query.page)) : null;
    const startDate = parseLocalDateOnly(start) || (start ? new Date(start) : null);
    const endDate = parseLocalDateOnly(end) || (end ? new Date(end) : null);
    const where = {};
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startOfDay(startDate);
        if (endDate) where.createdAt.lte = endOfDay(endDate);
    }
    const take = limit ? Math.min(200, Math.max(1, Number(limit))) : undefined;

    if (page) {
        const pageLimit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * pageLimit;
        const [transactions, total] = await Promise.all([
            prisma.transactions.findMany({
                where: { ...where, organizationId: req.user.organizationId },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip, take: pageLimit,
            }),
            prisma.transactions.count({ where: { ...where, organizationId: req.user.organizationId } }),
        ]);
        return res.json({ data: transactions, total, page, totalPages: Math.ceil(total / pageLimit) });
    }

    const transactions = await prisma.transactions.findMany({
        where: { ...where, organizationId: req.user.organizationId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
    });
    res.json(transactions);
});

exports.createTransaction = asyncHandler(async (req, res) => {
    const { label, type, category, amount, date, items, cogs } = req.body;
    const createdAt = date ? new Date(date) : new Date();

    let cogsValue = 0;
    const cart = getCartFromItems(items);
    const normalizedType = normalizeTypeWrite(type);

    if (normalizedType === 'Masuk' && cart.length > 0) {
        try {
            await computeFifoCogsAndUpdateBatches(cart, req.user.organizationId);
            cogsValue = 0;
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    } else {
        const cogsNum = Number(cogs);
        if (Number.isFinite(cogsNum) && cogsNum >= 0) {
            cogsValue = Math.round(cogsNum);
        } else {
            const productIds = Array.from(new Set(cart.map((x) => Number(x?.productId)).filter((x) => Number.isFinite(x))));
            const products = productIds.length
                ? await prisma.product.findMany({ where: { id: { in: productIds }, organizationId: req.user.organizationId }, select: { id: true, costPrice: true } })
                : [];
            const productCostById = new Map(products.map((p) => [p.id, p.costPrice]));
            cogsValue = computeCogsFromCart(cart, productCostById);
        }
    }

    const created = await prisma.transactions.create({
        data: {
            organizationId: req.user.organizationId,
            label,
            type: normalizeTypeWrite(type),
            category,
            amount: Number.isFinite(Number(amount)) ? parseInt(amount, 10) : 0,
            cogs: cogsValue,
            createdAt,
            items: items || null 
        }
    });
    res.status(201).json(created);
});

exports.getTransactionById = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID tidak valid' });

    const tx = await prisma.transactions.findFirst({ where: { id, organizationId: req.user.organizationId } });
    if (!tx) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

    res.json(tx);
});

exports.updateTransaction = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID tidak valid' });

    const { label, type, category, amount, date, items, cogs } = req.body;
    const patch = {
        ...(label !== undefined ? { label } : {}),
        ...(type !== undefined ? { type: normalizeTypeWrite(type) } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(amount !== undefined ? { amount: Number.isFinite(Number(amount)) ? parseInt(amount, 10) : 0 } : {}),
        ...(date !== undefined ? { createdAt: date ? new Date(date) : new Date() } : {}),
        ...(items !== undefined ? { items: items || null } : {}),
    };

    if (cogs !== undefined) {
        const cogsNum = Number(cogs);
        patch.cogs = Number.isFinite(cogsNum) && cogsNum >= 0 ? Math.round(cogsNum) : 0;
    } else if (items !== undefined) {
        const cart = getCartFromItems(items);
        const productIds = Array.from(new Set(cart.map((x) => Number(x?.productId)).filter((x) => Number.isFinite(x))));
        const products = productIds.length
            ? await prisma.product.findMany({ where: { id: { in: productIds }, organizationId: req.user.organizationId }, select: { id: true, costPrice: true } })
            : [];
        const productCostById = new Map(products.map((p) => [p.id, p.costPrice]));
        patch.cogs = computeCogsFromCart(cart, productCostById);
    }

    const updateResult = await prisma.transactions.updateMany({ where: { id, organizationId: req.user.organizationId }, data: patch });
    if (updateResult.count === 0) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    const updated = await prisma.transactions.findFirst({ where: { id, organizationId: req.user.organizationId } });
    res.json(updated);
});

exports.deleteTransaction = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const deleteResult = await prisma.transactions.deleteMany({ where: { id, organizationId: req.user.organizationId } });
    if (deleteResult.count === 0) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    res.json({ message: 'Transaksi berhasil dihapus' });
});