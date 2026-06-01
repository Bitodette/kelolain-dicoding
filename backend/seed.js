const prisma = require('./src/config/db');
const bcrypt = require('bcryptjs');

const categories = [
  { name: 'Sembako' },
  { name: 'Makanan' },
  { name: 'Minuman' },
  { name: 'Kebutuhan Harian' },
];

const products = [
  { name: 'Beras 5kg', category: 'Sembako', costPrice: 42000, price: 55000, stock: 50, status: 'Aman' },
  { name: 'Minyak Goreng 1L', category: 'Sembako', costPrice: 17000, price: 22000, stock: 30, status: 'Aman' },
  { name: 'Gula Pasir 1kg', category: 'Sembako', costPrice: 13000, price: 17000, stock: 25, status: 'Aman' },
  { name: 'Tepung Terigu 1kg', category: 'Sembako', costPrice: 12000, price: 16000, stock: 20, status: 'Aman' },
  { name: 'Mi Instan Indomie', category: 'Makanan', costPrice: 3500, price: 5500, stock: 100, status: 'Aman' },
  { name: 'Roti Tawar', category: 'Makanan', costPrice: 7000, price: 10000, stock: 15, status: 'Aman' },
  { name: 'Aqua 600ml', category: 'Minuman', costPrice: 4500, price: 7000, stock: 60, status: 'Aman' },
  { name: 'Teh Pucuk Harum 350ml', category: 'Minuman', costPrice: 6500, price: 9000, stock: 30, status: 'Aman' },
  { name: 'Susu UHT 1L', category: 'Minuman', costPrice: 20000, price: 26000, stock: 12, status: 'Aman' },
  { name: 'Sabun Mandi', category: 'Kebutuhan Harian', costPrice: 7000, price: 11000, stock: 25, status: 'Aman' },
  { name: 'Shampoo 200ml', category: 'Kebutuhan Harian', costPrice: 13000, price: 18000, stock: 10, status: 'Menipis' },
  { name: 'Odol Herbal', category: 'Kebutuhan Harian', costPrice: 8000, price: 12000, stock: 15, status: 'Aman' },
];

const productRefs = products.map(p => ({
  name: p.name, price: p.price, costPrice: p.costPrice,
}));

function rng(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function pick(arr, seed) {
  return arr[Math.floor(rng(seed) * arr.length)];
}

function makeCart(amount, seed) {
  const cart = [];
  let remaining = amount;
  let tries = 0;
  while (remaining > 2000 && tries < 15) {
    const ok = productRefs.filter(p => p.price <= remaining + 500);
    if (!ok.length) break;
    const p = ok[Math.floor(rng(seed + tries * 7) * ok.length)];
    const maxQty = Math.max(1, Math.floor(remaining / p.price));
    const qty = Math.min(maxQty, 1 + Math.floor(rng(seed + tries * 13) * 3));
    cart.push({ name: p.name, qty, price: p.price });
    remaining -= p.price * qty;
    tries++;
  }
  return cart;
}

function calcCogs(cart) {
  let total = 0;
  for (const item of cart) {
    const p = productRefs.find(x => x.name === item.name);
    if (p) total += p.costPrice * item.qty;
  }
  return total;
}

const monthConfig = [
  { year: 2025, month: 11, dailyAvg: 280000, growth: 1.00 },
  { year: 2026, month: 0, dailyAvg: 310000, growth: 1.08 },
  { year: 2026, month: 1, dailyAvg: 340000, growth: 1.16 },
  { year: 2026, month: 2, dailyAvg: 380000, growth: 1.25 },
  { year: 2026, month: 3, dailyAvg: 420000, growth: 1.35 },
  { year: 2026, month: 4, dailyAvg: 460000, growth: 1.46 },
  { year: 2026, month: 5, dailyAvg: 490000, growth: 1.55 },
];

const expenseSchedule = [
  { year: 2025, month: 11, label: 'Sewa tempat Desember', amount: 700000, category: 'Operasional' },
  { year: 2025, month: 11, label: 'Restock stok awal', amount: 1000000, category: 'Restock Barang' },
  { year: 2026, month: 0, label: 'Sewa tempat Januari', amount: 700000, category: 'Operasional' },
  { year: 2026, month: 0, label: 'Tagihan listrik Januari', amount: 350000, category: 'Operasional' },
  { year: 2026, month: 0, label: 'Restock stok Januari', amount: 800000, category: 'Restock Barang' },
  { year: 2026, month: 1, label: 'Sewa tempat Februari', amount: 700000, category: 'Operasional' },
  { year: 2026, month: 1, label: 'Gaji karyawan', amount: 1200000, category: 'Operasional' },
  { year: 2026, month: 1, label: 'Restock stok Februari', amount: 900000, category: 'Restock Barang' },
  { year: 2026, month: 2, label: 'Sewa tempat Maret', amount: 700000, category: 'Operasional' },
  { year: 2026, month: 2, label: 'Tagihan listrik Maret', amount: 400000, category: 'Operasional' },
  { year: 2026, month: 2, label: 'Restock stok Maret', amount: 1000000, category: 'Restock Barang' },
  { year: 2026, month: 3, label: 'Sewa tempat April', amount: 700000, category: 'Operasional' },
  { year: 2026, month: 3, label: 'Gaji karyawan April', amount: 1200000, category: 'Operasional' },
  { year: 2026, month: 3, label: 'Restock stok April', amount: 1100000, category: 'Restock Barang' },
  { year: 2026, month: 4, label: 'Sewa tempat Mei', amount: 700000, category: 'Operasional' },
  { year: 2026, month: 4, label: 'Tagihan listrik Mei', amount: 450000, category: 'Operasional' },
  { year: 2026, month: 4, label: 'Restock stok Mei', amount: 1200000, category: 'Restock Barang' },
  { year: 2026, month: 5, label: 'Sewa tempat Juni', amount: 700000, category: 'Operasional' },
  { year: 2026, month: 5, label: 'Gaji karyawan Juni', amount: 1200000, category: 'Operasional' },
  { year: 2026, month: 5, label: 'Restock stok Juni', amount: 1300000, category: 'Restock Barang' },
  { year: 2026, month: 5, label: 'Tagihan listrik Juni', amount: 500000, category: 'Operasional' },
];

const times = ['Pagi', 'Siang', 'Sore', 'Malam'];
const txHour = [8, 12, 16, 19];
const txWeight = [0.25, 0.3, 0.2, 0.25];

function generateAll() {
  const list = [];
  const start = new Date('2025-12-01');
  const end = new Date('2026-06-01');

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const cfg = monthConfig.find(m => m.year === d.getFullYear() && m.month === d.getMonth());
    if (!cfg) continue;

    const dow = d.getDay();
    const daySeed = d.getTime();

    // skip some Sundays
    if (dow === 0 && rng(daySeed) > 0.55) continue;

    // weekend dip, weekday normal
    const dowFactor = (dow === 0 || dow === 6) ? 0.55 + rng(daySeed + 3) * 0.15 : 0.85 + rng(daySeed + 7) * 0.3;
    // mid-month higher, edges lower
    const domFactor = 0.75 + rng(daySeed + 11) * 0.25 + Math.sin((d.getDate() / 31) * Math.PI) * 0.15;

    const dailyTarget = Math.round(cfg.dailyAvg * cfg.growth * dowFactor * domFactor);
    if (dailyTarget < 50000) continue;

    // weigh by txWeight to split daily into transactions
    const numTx = 3 + Math.floor(rng(daySeed + 17) * 1.5);
    const baseSplit = dailyTarget / numTx;

    for (let t = 0; t < numTx; t++) {
      const hour = 7 + t * 4 + Math.floor(rng(daySeed + t * 23) * 2);
      const min = Math.floor(rng(daySeed + t * 31) * 60);
      const txDate = new Date(d);
      txDate.setHours(hour, min, 0, 0);

      const share = baseSplit * (0.6 + rng(daySeed + t * 41) * 0.8);
      const amount = Math.round(share / 1000) * 1000;

      if (amount < 10000) continue;

      const cart = makeCart(amount, daySeed + t * 53);
      const cogs = calcCogs(cart);

      list.push({
        label: `Penjualan ${d.getDate()}/${d.getMonth() + 1} ${times[t] || 'Ekstra'}`,
        type: 'Masuk',
        category: 'Penjualan',
        amount,
        cogs,
        createdAt: txDate,
        items: { cart },
      });
    }
  }

  // add monthly expenses
  for (const ex of expenseSchedule) {
    const exDate = new Date(ex.year, ex.month, 20 + Math.floor(rng(ex.year * 100 + ex.month) * 8));
    exDate.setHours(9, 0, 0, 0);
    list.push({
      label: ex.label,
      type: 'Keluar',
      category: ex.category,
      amount: Math.round(ex.amount / 1000) * 1000,
      cogs: 0,
      createdAt: exDate,
      items: null,
    });
  }

  list.sort((a, b) => a.createdAt - b.createdAt);
  return list;
}

const generateLabel = idx => {
  const cfg = monthConfig[idx];
  if (!cfg) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${months[cfg.month]} ${cfg.year}`;
};

async function main() {
  console.log('Seeding data historis...');

  // --- user "test" ---
  let user = await prisma.user.findUnique({
    where: { username: 'test' },
    include: { roles: { include: { role: true } } },
  });

  if (!user) {
    const org = await prisma.organization.create({ data: { name: 'Toko Test' } });
    const adminRole = await prisma.role.create({
      data: {
        organizationId: org.id, name: 'Admin',
        pages: ['dashboard', 'keuangan', 'produk', 'kasir', 'insight', 'settings'],
      },
    });
    await prisma.role.create({
      data: {
        organizationId: org.id, name: 'User',
        pages: ['dashboard', 'keuangan', 'produk', 'kasir', 'insight'],
      },
    });
    const hashed = await bcrypt.hash('admin', 10);
    user = await prisma.user.create({
      data: {
        username: 'test', password: hashed, name: 'Toko Test',
        organizationId: org.id, active: true,
        roles: { create: [{ roleId: adminRole.id }] },
      },
    });
    console.log('  Akun test/admin dibuat.');
  } else {
    // pastikan role Admin ada
    let adminRole = await prisma.role.findFirst({
      where: { organizationId: user.organizationId, name: 'Admin' },
    });
    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          organizationId: user.organizationId, name: 'Admin',
          pages: ['dashboard', 'keuangan', 'produk', 'kasir', 'insight', 'settings'],
        },
      });
      await prisma.role.create({
        data: {
          organizationId: user.organizationId, name: 'User',
          pages: ['dashboard', 'keuangan', 'produk', 'kasir', 'insight'],
        },
      });
      console.log('  Role Admin & User dibuat.');
    }
    // pastikan user punya role Admin
    const hasAdmin = user.roles.some(r => r.role?.name === 'Admin');
    if (!hasAdmin && adminRole) {
      await prisma.userRole.create({ data: { userId: user.id, roleId: adminRole.id } });
      console.log('  Role Admin ditambahkan ke user.');
    } else {
      console.log('  Akun test sudah ada.');
    }
  }

  const orgId = user.organizationId;

  // --- categories ---
  const catMap = {};
  for (const c of categories) {
    const r = await prisma.category.upsert({
      where: { organizationId_name: { organizationId: orgId, name: c.name } },
      update: {}, create: { ...c, organizationId: orgId },
    });
    catMap[c.name] = r;
  }

  // --- products ---
  for (const p of products) {
    const existing = await prisma.product.findFirst({ where: { name: p.name, organizationId: orgId } });
    if (!existing) {
      await prisma.product.create({
        data: { ...p, categoryId: catMap[p.category]?.id || null, organizationId: orgId },
      });
    } else {
      await prisma.product.update({
        where: { id: existing.id },
        data: { costPrice: p.costPrice, price: p.price, stock: p.stock, status: p.status },
      });
    }
  }
  console.log('  Produk siap.');

  // --- delete old transactions for this org (clean slate) ---
  const oldCount = await prisma.transactions.count({ where: { organizationId: orgId } });
  if (oldCount > 0) {
    await prisma.transactions.deleteMany({ where: { organizationId: orgId } });
    console.log(`  ${oldCount} transaksi lama dihapus.`);
  }

  // --- generate & insert ---
  const all = generateAll();
  let inserted = 0;
  for (const tx of all) {
    await prisma.transactions.create({
      data: {
        organizationId: orgId,
        label: tx.label,
        type: tx.type,
        category: tx.category,
        amount: tx.amount,
        cogs: tx.cogs,
        createdAt: tx.createdAt,
        items: tx.items,
      },
    });
    inserted++;
    if (inserted % 200 === 0) console.log(`  ${inserted} transaksi...`);
  }

  console.log(`  Selesai: ${inserted} transaksi (${all.filter(t => t.type === 'Masuk').length} penjualan, ${all.filter(t => t.type === 'Keluar').length} pengeluaran).`);
  console.log('');
  console.log('  Login: username=test, password=admin');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
