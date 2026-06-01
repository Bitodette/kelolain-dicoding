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
  { year: 2025, month: 0, dailyAvg: 130000, growth: 1.00 },
  { year: 2025, month: 1, dailyAvg: 140000, growth: 1.02 },
  { year: 2025, month: 2, dailyAvg: 150000, growth: 1.05 },
  { year: 2025, month: 3, dailyAvg: 165000, growth: 1.08 },
  { year: 2025, month: 4, dailyAvg: 175000, growth: 1.10 },
  { year: 2025, month: 5, dailyAvg: 185000, growth: 1.12 },
  { year: 2025, month: 6, dailyAvg: 195000, growth: 1.14 },
  { year: 2025, month: 7, dailyAvg: 210000, growth: 1.16 },
  { year: 2025, month: 8, dailyAvg: 225000, growth: 1.17 },
  { year: 2025, month: 9, dailyAvg: 245000, growth: 1.18 },
  { year: 2025, month: 10, dailyAvg: 260000, growth: 1.19 },
  { year: 2025, month: 11, dailyAvg: 280000, growth: 1.20 },
  { year: 2026, month: 0, dailyAvg: 310000, growth: 1.08 },
  { year: 2026, month: 1, dailyAvg: 340000, growth: 1.16 },
  { year: 2026, month: 2, dailyAvg: 380000, growth: 1.25 },
  { year: 2026, month: 3, dailyAvg: 420000, growth: 1.35 },
  { year: 2026, month: 4, dailyAvg: 460000, growth: 1.46 },
  { year: 2026, month: 5, dailyAvg: 490000, growth: 1.55 },
];

const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const times = ['Pagi', 'Siang', 'Sore', 'Malam'];

const roundK = v => Math.round(v / 1000) * 1000;

function mkExpense(label, category, amount, year, month, day, hour, minute = 0) {
  return {
    label, type: 'Keluar', category, cogs: 0,
    amount: roundK(amount),
    createdAt: new Date(year, month, day, hour, minute, 0, 0),
    items: null,
  };
}

function generateExpenses() {
  const list = [];
  const months = [
    { year: 2025, month: 0 }, { year: 2025, month: 1 },
    { year: 2025, month: 2 }, { year: 2025, month: 3 },
    { year: 2025, month: 4 }, { year: 2025, month: 5 },
    { year: 2025, month: 6 }, { year: 2025, month: 7 },
    { year: 2025, month: 8 }, { year: 2025, month: 9 },
    { year: 2025, month: 10 }, { year: 2025, month: 11 },
    { year: 2026, month: 0 }, { year: 2026, month: 1 },
    { year: 2026, month: 2 }, { year: 2026, month: 3 },
    { year: 2026, month: 4 }, { year: 2026, month: 5 },
  ];

  for (const { year, month } of months) {
    const b = year * 100 + month;
    const mName = monthNames[month];

    // Sewa tempat — 1st–3rd
    list.push(mkExpense('Sewa tempat ' + mName, 'Sewa Tempat', 700000, year, month, 1 + Math.floor(rng(b * 3 + 1) * 3), 9));
    // Gaji karyawan — 25th–27th
    list.push(mkExpense('Gaji karyawan ' + mName, 'Gaji Karyawan', 1500000, year, month, 25 + Math.floor(rng(b * 7 + 3) * 3), 16));
    // Bayar listrik — mid-month, varies
    list.push(mkExpense('Tagihan listrik ' + mName, 'Operasional', 250000 + rng(b * 11 + 5) * 250000, year, month, 12 + Math.floor(rng(b * 13 + 7) * 7), 10));
    // Bayar PDAM — 8th–12th
    list.push(mkExpense('Bayar PDAM ' + mName, 'Operasional', 75000 + rng(b * 17 + 11) * 50000, year, month, 8 + Math.floor(rng(b * 19 + 13) * 5), 10));
    // WiFi & Internet — 5th–7th
    list.push(mkExpense('Bayar WiFi & Internet', 'Operasional', 200000, year, month, 5 + Math.floor(rng(b * 23 + 17) * 3), 9));

    // Restock barang — twice a month
    for (const half of [0, 1]) {
      const rDay = half === 0
        ? 3 + Math.floor(rng(b * 29 + 19 + half * 31) * 5)
        : 18 + Math.floor(rng(b * 31 + 23 + half * 37) * 5);
      list.push(mkExpense(
        half === 0 ? 'Restock stok ' + mName : 'Restock stok tambahan ' + mName,
        'Restock Barang', 600000 + rng(b * 37 + 29 + half * 43) * 900000, year, month, rDay, 8,
      ));
    }

    // Promosi & iklan — once a month
    const promoLabels = ['Promosi media sosial', 'Cetak spanduk & brosur', 'Biaya iklan online', 'Biaya endorse'];
    list.push(mkExpense(
      promoLabels[Math.floor(rng(b * 41 + 31) * promoLabels.length)],
      'Promosi & Iklan', 150000 + rng(b * 43 + 37) * 350000, year, month, 5 + Math.floor(rng(b * 47 + 41) * 15), 10,
    ));

    // Transportasi — 3–4× per month
    for (let w = 0; w < 3 + Math.floor(rng(b * 53 + 43) * 2); w++) {
      const tDay = 2 + w * 7 + Math.floor(rng(b * 59 + 47 + w * 61) * 4);
      if (tDay > 28) continue;
      list.push(mkExpense('Transportasi & bensin', 'Transportasi', 100000 + rng(b * 61 + 53 + w * 71) * 100000, year, month, tDay, 11));
    }

    // Operasional (ATK, kebersihan, dll) — twice a month
    const oLabels = ['Beli ATK & alat tulis', 'Keperluan kebersihan toko', 'Beli kantong plastik', 'Isi ulang galon', 'Beli bubble wrap & lakban'];
    for (let o = 0; o < 2; o++) {
      const oDay = o === 0
        ? 5 + Math.floor(rng(b * 67 + 59 + o * 73) * 5)
        : 18 + Math.floor(rng(b * 71 + 61 + o * 79) * 5);
      list.push(mkExpense(
        oLabels[Math.floor(rng(b * 73 + 67 + o * 83) * oLabels.length)],
        'Operasional', 50000 + rng(b * 79 + 71 + o * 89) * 100000, year, month, oDay, 9,
      ));
    }
  }

  // One-time irregular expenses
  const oneTime = [
    ['Beli etalase kaca baru', 'Operasional', 850000, 2026, 0, 15, 10],
    ['Perbaikan atap bocor', 'Operasional', 350000, 2026, 2, 8, 9],
    ['Sumbangan sosial warga', 'Pengeluaran Lainnya', 200000, 2026, 3, 17, 10],
    ['Beli timbangan digital', 'Operasional', 280000, 2026, 1, 10, 9],
    ['Servis AC toko', 'Operasional', 400000, 2026, 4, 22, 10],
    ['Perpanjangan NIB & legalitas', 'Pengeluaran Lainnya', 350000, 2026, 2, 20, 9],
    ['Beli rak display tambahan', 'Operasional', 550000, 2026, 3, 5, 10],
    ['Biaya renovasi toko', 'Operasional', 1500000, 2025, 2, 15, 9],
    ['Beli komputer kasir', 'Operasional', 3200000, 2025, 5, 10, 10],
    ['Acara grand opening', 'Promosi & Iklan', 500000, 2025, 0, 20, 9],
    ['Pasang CCTV toko', 'Operasional', 750000, 2025, 8, 5, 10],
    ['Sumbangan PHBI', 'Pengeluaran Lainnya', 300000, 2025, 9, 12, 10],
  ];
  for (const [label, cat, amount, y, m, d, h] of oneTime) {
    list.push(mkExpense(label, cat, amount, y, m, d, h));
  }

  return list;
}

function generateAll() {
  const list = [];
  const start = new Date('2025-01-01');
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
        category: 'Pendapatan Jualan',
        amount,
        cogs,
        createdAt: txDate,
        items: { cart },
      });
    }
  }

  // add expenses
  for (const ex of generateExpenses()) {
    list.push(ex);
  }

  // add occasional non-sales income (Pendapatan Lainnya)
  const otherIncome = [
    ['Cashback supplier', 150000, 2026, 0, 20, 10],
    ['Penjualan aset bekas', 450000, 2026, 2, 25, 14],
    ['Pengembalian deposit', 200000, 2026, 4, 12, 10],
    ['Cashback promo distributor', 120000, 2025, 3, 15, 10],
    ['Penjualan barang display lama', 350000, 2025, 7, 20, 11],
    ['Pendapatan sewa tempat parkir', 500000, 2025, 10, 5, 9],
  ];
  for (const [label, amount, y, m, d, h] of otherIncome) {
    const dt = new Date(y, m, d, h, 0, 0, 0);
    list.push({
      label, type: 'Masuk', category: 'Pendapatan Lainnya', cogs: 0,
      amount, createdAt: dt, items: null,
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
  const batchSize = 500;
  for (let i = 0; i < all.length; i += batchSize) {
    const batch = all.slice(i, i + batchSize).map(tx => ({
      organizationId: orgId,
      label: tx.label,
      type: tx.type,
      category: tx.category,
      amount: tx.amount,
      cogs: tx.cogs,
      createdAt: tx.createdAt,
      items: tx.items,
    }));
    await prisma.transactions.createMany({ data: batch });
    console.log(`  ${Math.min(i + batchSize, all.length)}/${all.length} transaksi...`);
  }

  console.log(`  Selesai: ${all.length} transaksi (${all.filter(t => t.type === 'Masuk').length} penjualan, ${all.filter(t => t.type === 'Keluar').length} pengeluaran).`);
  console.log('');
  console.log('  Login: username=test, password=admin');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
