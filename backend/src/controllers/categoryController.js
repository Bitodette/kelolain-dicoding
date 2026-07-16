const prisma = require('../config/db');
const { asyncHandler } = require('../middlewares/errorHandler');

exports.getCategories = asyncHandler(async (req, res) => {
    const categories = await prisma.category.findMany({ where: { organizationId: req.user.organizationId }, orderBy: { name: 'asc' } });
    res.json(categories);
});

exports.createCategory = asyncHandler(async (req, res) => {
    const { name } = req.body;
    const raw = String(name || '').trim();
    if (!raw) return res.status(400).json({ error: 'Nama kategori wajib diisi' });

    const normalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();

    const orgId = req.user.organizationId;
    const existing = await prisma.category.findFirst({ where: { organizationId: orgId, name: { equals: normalized, mode: 'insensitive' } } });
    if (existing) return res.status(400).json({ error: 'Kategori sudah ada' });

    const category = await prisma.category.create({ data: { name: normalized, organizationId: orgId } });
    res.status(201).json(category);
});

exports.deleteCategory = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID kategori tidak valid' });

    const deleteResult = await prisma.category.deleteMany({ where: { id, organizationId: req.user.organizationId } });
    if (deleteResult.count === 0) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    res.json({ message: 'Kategori berhasil dihapus' });
});
