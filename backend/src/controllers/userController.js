const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { asyncHandler } = require('../middlewares/errorHandler');
const { invalidateUser, invalidateOrgUsers } = require('../utils/userCache');

const normalizeRoleIds = (roleIds) => {
    if (!Array.isArray(roleIds)) return [];
    return Array.from(new Set(roleIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)));
};

exports.getUsers = asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
        where: { organizationId: req.user.organizationId },
        orderBy: { name: 'asc' },
        include: { roles: { include: { role: true } } },
        take: 200,
    });
    const formatted = users.map((user) => ({
        id: user.id,
        name: user.name,
        roles: user.roles.map((ur) => ({ id: ur.role.id, name: ur.role.name, pages: ur.role.pages })),
    }));
    res.json(formatted);
});

exports.createUser = asyncHandler(async (req, res) => {
    const { name, password, roleIds } = req.body;
    const trimmedName = String(name || '').trim();
    if (!trimmedName || !password) {
        return res.status(400).json({ error: 'Nama dan password wajib diisi' });
    }

    const existing = await prisma.user.findFirst({ where: { username: trimmedName } });
    if (existing) return res.status(400).json({ error: 'Nama sudah digunakan' });

    const normalizedRoleIds = normalizeRoleIds(roleIds);
    if (normalizedRoleIds.length === 0) {
        return res.status(400).json({ error: 'Pengguna harus memiliki minimal 1 role' });
    }

    const orgId = req.user.organizationId;
    const validRoles = await prisma.role.findMany({
        where: { id: { in: normalizedRoleIds }, organizationId: orgId },
        select: { id: true },
    });
    if (validRoles.length !== normalizedRoleIds.length) {
        return res.status(400).json({ error: 'Beberapa role tidak valid untuk organisasi Anda' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            username: trimmedName,
            password: hashedPassword,
            name: trimmedName,
            active: true,
            organizationId: orgId,
            roles: {
                create: normalizedRoleIds.map((roleId) => ({ role: { connect: { id: roleId } } })),
            },
        },
        include: { roles: { include: { role: true } } },
    });

    res.status(201).json({
        id: user.id,
        name: user.name,
        roles: user.roles.map((ur) => ({ id: ur.role.id, name: ur.role.name, pages: ur.role.pages })),
    });
});

exports.updateUser = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { password, name, active, roleIds } = req.body;
    const patch = {};

    if (password !== undefined && password !== '') {
        patch.password = await bcrypt.hash(String(password), 10);
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
    invalidateUser(id);
    const user = await prisma.user.findFirst({ where: { id, organizationId: req.user.organizationId }, include: { roles: { include: { role: true } } } });

    res.json({
        id: user.id,
        name: user.name,
        roles: user.roles.map((ur) => ({ id: ur.role.id, name: ur.role.name, pages: ur.role.pages })),
    });
});

exports.deleteUser = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (id === req.user.id) {
        return res.status(400).json({ error: 'Anda tidak dapat menghapus akun sendiri.' });
    }

    const deleteResult = await prisma.user.deleteMany({ where: { id, organizationId: req.user.organizationId } });
    if (deleteResult.count === 0) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    invalidateUser(id);
    res.json({ message: 'Pengguna berhasil dihapus' });
});
