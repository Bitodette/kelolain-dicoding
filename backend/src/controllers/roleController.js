const prisma = require('../config/db');
const { asyncHandler } = require('../middlewares/errorHandler');

const normalizePages = (pages) => {
    if (!Array.isArray(pages)) return [];
    return Array.from(new Set(pages.filter((page) => typeof page === 'string').map((page) => page.trim()).filter(Boolean)));
};

exports.getRoles = asyncHandler(async (req, res) => {
    const roles = await prisma.role.findMany({ where: { organizationId: req.user.organizationId }, orderBy: { name: 'asc' } });
    res.json(roles);
});

exports.createRole = asyncHandler(async (req, res) => {
    const { name, pages } = req.body;
    const trimmedName = String(name || '').trim();
    if (!trimmedName) return res.status(400).json({ error: 'Nama role wajib diisi' });

    const orgId = req.user.organizationId;
    const existing = await prisma.role.findFirst({ where: { organizationId: orgId, name: trimmedName } });
    if (existing) return res.status(400).json({ error: 'Role sudah ada' });

    const role = await prisma.role.create({ data: { name: trimmedName, pages: normalizePages(pages), organizationId: orgId } });
    res.status(201).json(role);
});

exports.updateRole = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { name, pages } = req.body;
    const data = {};

    if (name !== undefined) {
        const trimmedName = String(name || '').trim();
        if (!trimmedName) return res.status(400).json({ error: 'Nama role wajib diisi' });
        data.name = trimmedName;
    }

    if (pages !== undefined) {
        data.pages = normalizePages(pages);
    }

    const updateResult = await prisma.role.updateMany({ where: { id, organizationId: req.user.organizationId }, data });
    if (updateResult.count === 0) return res.status(404).json({ error: 'Role tidak ditemukan' });
    const role = await prisma.role.findFirst({ where: { id, organizationId: req.user.organizationId } });
    res.json(role);
});

exports.deleteRole = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const roleUsage = await prisma.userRole.count({
        where: {
            roleId: id,
            role: { organizationId: req.user.organizationId },
        },
    });

    if (roleUsage > 0) {
        return res.status(400).json({ error: 'Role tidak bisa dihapus karena masih digunakan oleh pengguna.' });
    }

    const deleteResult = await prisma.role.deleteMany({ where: { id, organizationId: req.user.organizationId } });
    if (deleteResult.count === 0) return res.status(404).json({ error: 'Role tidak ditemukan' });
    res.json({ message: 'Role berhasil dihapus' });
});
