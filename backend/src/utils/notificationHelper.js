const prisma = require('../config/db');

const LOW_STOCK_THRESHOLD = 5;

async function syncLowStockNotifications(orgId) {
    const lowStockProducts = await prisma.product.findMany({
        where: { organizationId: orgId, stock: { lte: LOW_STOCK_THRESHOLD } },
    });

    const existing = await prisma.notification.findMany({
        where: { organizationId: orgId, type: 'low_stock' },
    });
    const existingMap = new Map(existing.map((n) => [n.productId, n]));
    const lowIds = new Set(lowStockProducts.map((p) => p.id));

    for (const p of lowStockProducts) {
        const text = `Stok "${p.name}" tersisa ${p.stock} pcs`;
        const notif = existingMap.get(p.id);
        if (notif) {
            if (notif.text !== text) {
                await prisma.notification.update({ where: { id: notif.id }, data: { text } });
            }
        } else {
            await prisma.notification.create({
                data: { organizationId: orgId, type: 'low_stock', text, link: '/produk', productId: p.id },
            });
        }
    }

    const toDelete = existing.filter((n) => n.productId && !lowIds.has(n.productId)).map((n) => n.id);
    if (toDelete.length > 0) {
        await prisma.notification.deleteMany({ where: { id: { in: toDelete } } });
    }
}

module.exports = { syncLowStockNotifications };
