const prisma = require('../config/db');
const { asyncHandler } = require('../middlewares/errorHandler');

exports.getNotifications = asyncHandler(async (req, res) => {
    const orgId = req.user.organizationId;
    const notifications = await prisma.notification.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 100,
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
