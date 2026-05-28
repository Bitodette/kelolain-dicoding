const prisma = require('../config/db');

exports.getCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({ where: { organizationId: req.user.organizationId }, orderBy: { name: 'asc' } });
        res.json(categories);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Gagal mengambil kategori' });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const trimmedName = String(name || '').trim();
        if (!trimmedName) return res.status(400).json({ error: 'Nama kategori wajib diisi' });

        const orgId = req.user.organizationId;
        const existing = await prisma.category.findFirst({ where: { organizationId: orgId, name: trimmedName } });
        if (existing) return res.status(400).json({ error: 'Kategori sudah ada' });

        const category = await prisma.category.create({ data: { name: trimmedName, organizationId: orgId } });
        res.status(201).json(category);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Gagal membuat kategori' });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID kategori tidak valid' });

        const deleteResult = await prisma.category.deleteMany({ where: { id, organizationId: req.user.organizationId } });
        if (deleteResult.count === 0) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
        res.json({ message: 'Kategori berhasil dihapus' });
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: 'Kategori tidak ditemukan' });
        console.error(err.message);
        res.status(500).json({ error: 'Gagal menghapus kategori' });
    }
};
