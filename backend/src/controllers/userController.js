const bcrypt = require('bcryptjs');
const prisma = require('../config/db');

const normalizeRoleIds = (roleIds) => {
    if (!Array.isArray(roleIds)) return [];
    return Array.from(new Set(roleIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)));
};

exports.getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { organizationId: req.user.organizationId },
            orderBy: { username: 'asc' },
            include: { roles: { include: { role: true } } },
        });
        const formatted = users.map((user) => ({
            id: user.id,
            username: user.username,
            name: user.name,
            active: user.active,
            roles: user.roles.map((ur) => ({ id: ur.role.id, name: ur.role.name, pages: ur.role.pages })),
        }));
        res.json(formatted);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Gagal mengambil pengguna' });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { username, password, name, roleIds } = req.body;
        const trimmedUsername = String(username || '').trim();
        if (!trimmedUsername || !password) {
            return res.status(400).json({ error: 'Username dan password wajib diisi' });
        }

        const existing = await prisma.user.findUnique({ where: { username: trimmedUsername } });
        if (existing) return res.status(400).json({ error: 'Username sudah digunakan' });

        const normalizedRoleIds = normalizeRoleIds(roleIds);
        const orgId = req.user.organizationId;
        let roleConnections = undefined;

        if (normalizedRoleIds.length > 0) {
            const validRoles = await prisma.role.findMany({
                where: { id: { in: normalizedRoleIds }, organizationId: orgId },
                select: { id: true },
            });
            const validRoleIds = validRoles.map((role) => role.id);
            if (validRoleIds.length !== normalizedRoleIds.length) {
                return res.status(400).json({ error: 'Beberapa role tidak valid untuk organisasi Anda' });
            }
            roleConnections = {
                create: validRoleIds.map((roleId) => ({ role: { connect: { id: roleId } } })),
            };
        }

        const hashedPassword = bcrypt.hashSync(password, 10);

        const user = await prisma.user.create({
            data: {
                username: trimmedUsername,
                password: hashedPassword,
                name: String(name || trimmedUsername).trim() || trimmedUsername,
                organizationId: orgId,
                roles: roleConnections,
            },
            include: { roles: { include: { role: true } } },
        });

        res.status(201).json({
            id: user.id,
            username: user.username,
            name: user.name,
            active: user.active,
            roles: user.roles.map((ur) => ({ id: ur.role.id, name: ur.role.name, pages: ur.role.pages })),
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Gagal membuat pengguna' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { password, name, active, roleIds } = req.body;
        const patch = {};

        if (password !== undefined && password !== '') {
            patch.password = bcrypt.hashSync(String(password), 10);
        }

        if (name !== undefined) {
            patch.name = String(name || '').trim();
        }

        if (active !== undefined) {
            patch.active = Boolean(active);
        }

        if (Array.isArray(roleIds)) {
            const normalizedRoleIds = normalizeRoleIds(roleIds);
            const validRoles = await prisma.role.findMany({
                where: { id: { in: normalizedRoleIds }, organizationId: req.user.organizationId },
                select: { id: true },
            });
            const validRoleIds = validRoles.map((role) => role.id);
            if (validRoleIds.length !== normalizedRoleIds.length) {
                return res.status(400).json({ error: 'Beberapa role tidak valid untuk organisasi Anda' });
            }
            patch.roles = {
                deleteMany: {},
                create: validRoleIds.map((roleId) => ({ role: { connect: { id: roleId } } })),
            };
        }

        const updateResult = await prisma.user.updateMany({
            where: { id, organizationId: req.user.organizationId },
            data: patch,
        });
        if (updateResult.count === 0) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
        const user = await prisma.user.findFirst({ where: { id, organizationId: req.user.organizationId }, include: { roles: { include: { role: true } } } });

        res.json({
            id: user.id,
            username: user.username,
            name: user.name,
            active: user.active,
            roles: user.roles.map((ur) => ({ id: ur.role.id, name: ur.role.name, pages: ur.role.pages })),
        });
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
        console.error(err.message);
        res.status(500).json({ error: 'Gagal memperbarui pengguna' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (id === req.user.id) {
            return res.status(400).json({ error: 'Anda tidak dapat menghapus akun sendiri.' });
        }

        const deleteResult = await prisma.user.deleteMany({ where: { id, organizationId: req.user.organizationId } });
        if (deleteResult.count === 0) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
        res.json({ message: 'Pengguna berhasil dihapus' });
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
        console.error(err.message);
        res.status(500).json({ error: 'Gagal menghapus pengguna' });
    }
};
