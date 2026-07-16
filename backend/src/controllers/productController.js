const prisma = require('../config/db');
const { asyncHandler } = require('../middlewares/errorHandler');
const { getStatusFromStock } = require('../utils/stockHelper');
const { syncLowStockNotifications } = require('../utils/notificationHelper');

exports.getProducts = asyncHandler(async (req, res) => {
    const orgId = req.user.organizationId;
    const page = req.query.page ? Math.max(1, Number(req.query.page)) : null;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    if (page) {
        const skip = (page - 1) * limit;
        const [products, total] = await Promise.all([
            prisma.product.findMany({ where: { organizationId: orgId }, orderBy: { id: 'asc' }, skip, take: limit }),
            prisma.product.count({ where: { organizationId: orgId } }),
        ]);
        return res.json({ data: products, total, page, totalPages: Math.ceil(total / limit) });
    }

    const products = await prisma.product.findMany({ where: { organizationId: orgId }, orderBy: { id: 'asc' }, take: 200 });
    res.json(products);
});

exports.createProduct = asyncHandler(async (req, res) => {
    const { name, category, categoryId, costPrice, price, stock } = req.body;
    const parsedCost = Number.isFinite(Number(costPrice)) ? parseInt(costPrice, 10) : 0;
    const parsedPrice = Number.isFinite(Number(price)) ? parseInt(price, 10) : 0;
    const parsedStock = Number.isFinite(Number(stock)) ? parseInt(stock, 10) : 0;
    const orgId = req.user.organizationId;
    const selectedCategoryId = Number.isFinite(Number(categoryId)) ? parseInt(categoryId, 10) : null;
    let categoryName = String(category || '').trim() || null;

    const existingProduct = await prisma.product.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, organizationId: orgId } });
    if (existingProduct) {
        return res.status(409).json({ error: 'Produk dengan nama tersebut sudah ada.' });
    }

    if (selectedCategoryId) {
        const categoryRecord = await prisma.category.findFirst({ where: { id: selectedCategoryId, organizationId: orgId } });
        if (categoryRecord) categoryName = categoryRecord.name;
    }

    const totalInitialCost = parsedStock > 0 ? parsedCost * parsedStock : 0;

    const [product] = await prisma.$transaction(async (tx) => {
        const p = await tx.product.create({
            data: {
                name,
                category: categoryName,
                categoryId: selectedCategoryId,
                organizationId: orgId,
                costPrice: parsedCost,
                price: parsedPrice,
                stock: parsedStock,
                status: getStatusFromStock(parsedStock),
                batches: {
                    create: parsedStock > 0 ? {
                        costPrice: parsedCost,
                        initialQty: parsedStock,
                        currentQty: parsedStock,
                    } : undefined,
                },
            }
        });

        if (parsedStock > 0) {
            await tx.transactions.create({
                data: {
                    organizationId: orgId,
                    label: `Tambah produk ${name}`,
                    type: 'Keluar',
                    category: 'Restock Barang',
                    amount: totalInitialCost,
                    cogs: 0,
                    items: { products: [{ productId: p.id, qty: parsedStock, costPrice: parsedCost }] },
                }
            });
        }

        return [p];
    });

    res.status(201).json(product);
});

exports.updateProduct = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { name, category, categoryId, costPrice, price, stock, status } = req.body;
    const orgId = req.user.organizationId;
    const existingProduct = await prisma.product.findFirst({ where: { id, organizationId: orgId } });
    if (!existingProduct) return res.status(404).json({ error: 'Produk tidak ditemukan' });

    if (name && name.toLowerCase().trim() !== existingProduct.name.toLowerCase().trim()) {
        const duplicate = await prisma.product.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, organizationId: orgId, id: { not: id } } });
        if (duplicate) {
            return res.status(409).json({ error: 'Produk dengan nama tersebut sudah ada.' });
        }
    }

    const parsedCost = Number.isFinite(Number(costPrice)) ? parseInt(costPrice, 10) : existingProduct.costPrice;
    const parsedPrice = Number.isFinite(Number(price)) ? parseInt(price, 10) : existingProduct.price;
    const parsedStock = Number.isFinite(Number(stock)) ? parseInt(stock, 10) : existingProduct.stock;
    const stockDelta = parsedStock - (existingProduct.stock || 0);
    const selectedCategoryId = Number.isFinite(Number(categoryId)) ? parseInt(categoryId, 10) : null;
    let categoryName = String(category || existingProduct.category || '').trim() || null;

    if (selectedCategoryId) {
        const categoryRecord = await prisma.category.findFirst({ where: { id: selectedCategoryId, organizationId: orgId } });
        if (categoryRecord) categoryName = categoryRecord.name;
    }

    if (stockDelta < 0) {
        const reduceQty = Math.abs(stockDelta);
        let remaining = reduceQty;
        let totalCostConsumed = 0;

        const batches = await prisma.productBatch.findMany({
            where: { productId: id, currentQty: { gt: 0 } },
            orderBy: { createdAt: 'asc' },
        });

        const batchUpdates = [];
        for (const batch of batches) {
            if (remaining <= 0) break;
            const take = Math.min(remaining, Number(batch.currentQty));
            totalCostConsumed += take * Number(batch.costPrice);
            batchUpdates.push({
                id: batch.id,
                currentQty: Number(batch.currentQty) - take,
            });
            remaining -= take;
        }

        await Promise.all(
            batchUpdates.map((u) =>
                prisma.productBatch.update({
                    where: { id: u.id },
                    data: { currentQty: u.currentQty },
                })
            )
        );

        await prisma.product.update({
            where: { id },
            data: {
                name,
                category: categoryName,
                categoryId: selectedCategoryId,
                costPrice: parsedCost,
                price: parsedPrice,
                stock: parsedStock,
                status: status || getStatusFromStock(parsedStock),
            },
        });

        await prisma.transactions.create({
            data: {
                organizationId: orgId,
                label: `Koreksi stok ${existingProduct.name}`,
                type: 'Keluar',
                category: 'Koreksi Stok',
                amount: totalCostConsumed,
                cogs: 0,
                items: { cart: [{ productId: id, name: existingProduct.name, qty: reduceQty, price: totalCostConsumed > 0 ? Math.round(totalCostConsumed / reduceQty) : parsedCost, costPrice: parsedCost }] },
            },
        });
    } else {
        const updateData = {
            name,
            category: categoryName,
            categoryId: selectedCategoryId,
            costPrice: parsedCost,
            price: parsedPrice,
            stock: parsedStock,
            status: status || getStatusFromStock(parsedStock),
        };

        if (stockDelta > 0) {
            updateData.batches = {
                create: {
                    costPrice: parsedCost,
                    initialQty: stockDelta,
                    currentQty: stockDelta,
                }
            };
        }

        await prisma.product.update({ where: { id }, data: updateData });
    }

    await syncLowStockNotifications(orgId);

    const product = await prisma.product.findFirst({ where: { id, organizationId: orgId } });
    res.json(product);
});

exports.restockProduct = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { quantity, costPrice } = req.body;
    const restockQty = Number.isFinite(Number(quantity)) ? parseInt(quantity, 10) : 0;
    const restockCost = Number.isFinite(Number(costPrice)) ? parseInt(costPrice, 10) : 0;

    if (restockQty <= 0) {
        return res.status(400).json({ error: 'Jumlah restock harus lebih besar dari 0' });
    }

    const orgId = req.user.organizationId;
    const existingProduct = await prisma.product.findFirst({ where: { id, organizationId: orgId } });
    if (!existingProduct) return res.status(404).json({ error: 'Produk tidak ditemukan' });

    const newStock = (existingProduct.stock || 0) + restockQty;
    const totalRestockCost = restockQty * restockCost;

    await prisma.$transaction([
        prisma.product.update({
            where: { id },
            data: {
                stock: newStock,
                costPrice: restockCost,
                status: getStatusFromStock(newStock),
                batches: {
                    create: {
                        costPrice: restockCost,
                        initialQty: restockQty,
                        currentQty: restockQty,
                    }
                }
            }
        }),
        prisma.transactions.create({
            data: {
                organizationId: orgId,
                label: `Restock ${existingProduct.name}`,
                type: 'Keluar',
                category: 'Restock Barang',
                amount: totalRestockCost,
                cogs: 0,
                items: { products: [{ productId: id, qty: restockQty, costPrice: restockCost }] },
            }
        }),
    ]);

    const product = await prisma.product.findFirst({ where: { id, organizationId: orgId } });
    await syncLowStockNotifications(orgId);
    res.json(product);
});

exports.deleteProduct = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const orgId = req.user.organizationId;
    const product = await prisma.product.findFirst({ where: { id, organizationId: orgId } });
    if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan' });

    await prisma.$transaction([
        prisma.notification.deleteMany({ where: { productId: id, organizationId: orgId } }),
        prisma.product.deleteMany({ where: { id, organizationId: orgId } }),
    ]);

    await syncLowStockNotifications(orgId);
    res.json({ message: 'Produk berhasil dihapus' });
});