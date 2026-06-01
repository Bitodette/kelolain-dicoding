const prisma = require('../config/db');
const { asyncHandler } = require('../middlewares/errorHandler');

const THRESHOLD = 5;

async function syncLowStockNotifications(orgId) {
    const lowStockProducts = await prisma.product.findMany({
        where: { organizationId: orgId, stock: { lte: THRESHOLD } },
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

exports.getNotifications = asyncHandler(async (req, res) => {
    const orgId = req.user.organizationId;
    await syncLowStockNotifications(orgId);
    const notifications = await prisma.notification.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
});

exports.markRead = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID notifikasi tidak valid' });
    const notif = await prisma.notification.updateMany({
        where: { id, organizationId: req.user.organizationId },
        data: { read: true },
    });
    if (notif.count === 0) return res.status(404).json({ error: 'Notifikasi tidak ditemukan' });
    res.json({ message: 'Notifikasi dibaca' });
});

exports.markAllRead = asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
        where: { organizationId: req.user.organizationId, read: false },
        data: { read: true },
    });
    res.json({ message: 'Semua notifikasi dibaca' });
});
