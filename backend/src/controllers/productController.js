const prisma = require('../config/db');

const getStatusFromStock = (stock) => {
    if (stock <= 0) return 'Habis';
    if (stock <= 5) return 'Menipis';
    return 'Aman';
};

exports.getProducts = async (req, res) => {
    try {
        const orgId = req.user.organizationId;
        const products = await prisma.product.findMany({ where: { organizationId: orgId }, orderBy: { id: 'asc' } });
        res.json(products);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const { name, category, categoryId, costPrice, price, stock } = req.body;
        const parsedCost = Number.isFinite(Number(costPrice)) ? parseInt(costPrice, 10) : 0;
        const parsedPrice = Number.isFinite(Number(price)) ? parseInt(price, 10) : 0;
        const parsedStock = Number.isFinite(Number(stock)) ? parseInt(stock, 10) : 0;
        const orgId = req.user.organizationId;
        const selectedCategoryId = Number.isFinite(Number(categoryId)) ? parseInt(categoryId, 10) : null;
        let categoryName = String(category || '').trim() || null;

        if (selectedCategoryId) {
            const categoryRecord = await prisma.category.findFirst({ where: { id: selectedCategoryId, organizationId: orgId } });
            if (categoryRecord) categoryName = categoryRecord.name;
        }

        const totalInitialCost = parsedStock > 0 ? parsedCost * parsedStock : 0;

        const [product] = await prisma.$transaction([
            prisma.product.create({
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
            }),
            ...(parsedStock > 0 ? [
                prisma.transactions.create({
                    data: {
                        organizationId: orgId,
                        label: `Tambah produk ${name}`,
                        type: 'Keluar',
                        category: 'Restock Barang',
                        amount: totalInitialCost,
                        cogs: 0,
                        items: null,
                    }
                })
            ] : []),
        ]);

        res.status(201).json(product);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Gagal menambah produk' });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { name, category, categoryId, costPrice, price, stock, status } = req.body;
        const orgId = req.user.organizationId;
        const existingProduct = await prisma.product.findFirst({ where: { id, organizationId: orgId } });
        if (!existingProduct) return res.status(404).json({ error: 'Produk tidak ditemukan' });

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

        const updateResult = await prisma.product.updateMany({
            where: { id, organizationId: orgId },
            data: updateData,
        });
        if (updateResult.count === 0) return res.status(404).json({ error: 'Produk tidak ditemukan' });

        const product = await prisma.product.findFirst({ where: { id, organizationId: orgId } });
        res.json(product);
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: 'Produk tidak ditemukan' });
        console.error(err.message);
        res.status(500).json({ error: 'Gagal mengupdate produk' });
    }
};

exports.restockProduct = async (req, res) => {
    try {
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
                    items: null,
                }
            }),
        ]);

        const product = await prisma.product.findFirst({ where: { id, organizationId: orgId } });
        res.json(product);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Gagal melakukan restock produk' });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const deleteResult = await prisma.product.deleteMany({ where: { id, organizationId: req.user.organizationId } });
        if (deleteResult.count === 0) return res.status(404).json({ error: 'Produk tidak ditemukan' });
        res.json({ message: 'Produk berhasil dihapus' });
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: 'Produk tidak ditemukan' });
        console.error(err.message);
        res.status(500).json({ error: 'Gagal menghapus produk' });
    }
};