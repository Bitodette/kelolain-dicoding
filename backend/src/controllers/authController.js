const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { asyncHandler } = require('../middlewares/errorHandler');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('JWT_SECRET tidak diatur di environment variables. Aplikasi tidak bisa berjalan.');
    process.exit(1);
}

const JWT_EXPIRES_IN = '8h';
const JWT_REMEMBER_EXPIRES_IN = '30d';
const DEFAULT_ADMIN_ROLE = 'Admin';
const DEFAULT_ADMIN_PAGES = ['dashboard', 'keuangan', 'produk', 'kasir', 'insight', 'settings'];
const DEFAULT_USER_ROLE = 'User';
const DEFAULT_USER_PAGES = ['dashboard', 'keuangan', 'produk', 'kasir', 'insight'];

const normalizePages = (pages) => {
  if (!Array.isArray(pages)) return [];
  return Array.from(new Set(pages.filter((page) => typeof page === 'string').map((page) => page.trim()).filter(Boolean)));
};

const buildUserResponse = (user) => {
  const roles = (user.roles || []).map((ur) => ur.role?.name).filter(Boolean);
  const allowedPages = Array.from(
    new Set(
      (user.roles || [])
        .flatMap((ur) => ur.role?.pages || [])
        .filter((page) => typeof page === 'string')
    )
  );

  return {
    id: user.id,
    username: user.username,
    name: user.name || user.username,
    active: user.active,
    roles,
    allowedPages,
    organizationId: user.organizationId,
    organizationName: user.organization?.name || null,
  };
};

const ensureRoleForOrganization = async (organizationId, name, pages) => {
  return prisma.role.upsert({
    where: { organizationId_name: { organizationId, name } },
    update: { pages: normalizePages(pages) },
    create: { organizationId, name, pages: normalizePages(pages) },
  });
};

const ensureDefaultUserRole = async (organizationId) => {
  return ensureRoleForOrganization(organizationId, DEFAULT_USER_ROLE, DEFAULT_USER_PAGES);
};

exports.register = async (req, res) => {
  const { username, password, name } = req.body || {};

  const trimmedUsername = String(username || '').trim();
  const trimmedName = String(name || trimmedUsername).trim();

  if (!trimmedUsername || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }

  const existingUser = await prisma.user.findUnique({ where: { username: trimmedUsername } });
  if (existingUser) {
    return res.status(400).json({ error: 'Username sudah digunakan' });
  }

  const organization = await prisma.organization.create({
    data: {
      name: `${trimmedUsername}-store`,
    },
  });

  const adminRole = await ensureRoleForOrganization(organization.id, DEFAULT_ADMIN_ROLE, DEFAULT_ADMIN_PAGES);
  await ensureDefaultUserRole(organization.id);
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username: trimmedUsername,
      password: hashedPassword,
      name: trimmedName,
      active: true,
      organization: { connect: { id: organization.id } },
      roles: {
        create: [{ role: { connect: { id: adminRole.id } } }],
      },
    },
    include: { roles: { include: { role: true } }, organization: true },
  });

  const token = jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return res.status(201).json({ token, user: buildUserResponse(user), rememberMe: false });
};

exports.login = async (req, res) => {
  const { username, password, rememberMe } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }

  let user = await prisma.user.findUnique({
    where: { username },
    include: { roles: { include: { role: true } }, organization: true },
  });

  if (!user) {
    return res.status(401).json({ error: 'Username atau password salah' });
  }

  if (!user.active) {
    return res.status(403).json({ error: 'Akun tidak aktif' });
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Username atau password salah' });
  }

  const expiresIn = rememberMe ? JWT_REMEMBER_EXPIRES_IN : JWT_EXPIRES_IN;
  const token = jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, {
    expiresIn,
  });

  res.json({ token, user: buildUserResponse(user), rememberMe: Boolean(rememberMe) });
};

exports.me = async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (!token) {
    return res.status(401).json({ error: 'Token tidak ditemukan' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = Number(decoded.sub);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } }, organization: true },
    });

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Token tidak valid atau pengguna tidak aktif' });
    }

    return res.json({ user: buildUserResponse(user) });
  } catch (error) {
    return res.status(401).json({ error: 'Token tidak valid' });
  }
};

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, password } = req.body;
  const userId = req.user.id;
  const patch = {};

  if (name !== undefined) {
    patch.name = String(name || '').trim();
  }

  if (password) {
    patch.password = await bcrypt.hash(String(password), 10);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: patch,
    include: { roles: { include: { role: true } }, organization: true },
  });

  return res.json({ user: buildUserResponse(updatedUser) });
});


