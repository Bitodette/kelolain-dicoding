const prisma = require('./src/config/db');

const categories = [
  { name: 'Sembako' },
  { name: 'Makanan' },
  { name: 'Minuman' },
  { name: 'Kebutuhan Harian' },
];

const products = [
  { name: 'Beras 5kg', category: 'Sembako', costPrice: 45000, price: 55000, stock: 20, status: 'Aman' },
  { name: 'Minyak Goreng 1L', category: 'Sembako', costPrice: 18000, price: 22000, stock: 12, status: 'Aman' },
  { name: 'Gula Pasir 1kg', category: 'Sembako', costPrice: 13500, price: 16000, stock: 8, status: 'Menipis' },
  { name: 'Tepung Terigu 1kg', category: 'Sembako', costPrice: 13000, price: 15500, stock: 15, status: 'Aman' },
  { name: 'Mi Instan Indomie', category: 'Makanan', costPrice: 4000, price: 5500, stock: 18, status: 'Aman' },
  { name: 'Roti Tawar', category: 'Makanan', costPrice: 8000, price: 10000, stock: 7, status: 'Menipis' },
  { name: 'Aqua 600ml', category: 'Minuman', costPrice: 5000, price: 7000, stock: 25, status: 'Aman' },
  { name: 'Teh Pucuk Harum 350ml', category: 'Minuman', costPrice: 7000, price: 9000, stock: 9, status: 'Menipis' },
  { name: 'Susu UHT 1L', category: 'Minuman', costPrice: 22000, price: 26000, stock: 3, status: 'Menipis' },
  { name: 'Sabun Mandi', category: 'Kebutuhan Harian', costPrice: 8000, price: 11000, stock: 10, status: 'Aman' },
  { name: 'Shampoo 200ml', category: 'Kebutuhan Harian', costPrice: 14000, price: 18000, stock: 4, status: 'Menipis' },
  { name: 'Odol Herbal', category: 'Kebutuhan Harian', costPrice: 9000, price: 12000, stock: 6, status: 'Menipis' },
];

const transactions = [
  {
    label: 'Penjualan H-2 Pagi',
    type: 'Masuk',
    category: 'Penjualan',
    amount: 254000,
    cogs: 175000,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 2)),
    items: {
      cart: [
        { name: 'Beras 5kg', qty: 1, price: 55000 },
        { name: 'Aqua 600ml', qty: 3, price: 7000 },
        { name: 'Mi Instan Indomie', qty: 4, price: 5500 },
      ],
    },
  },
  {
    label: 'Penjualan H-2 Siang',
    type: 'Masuk',
    category: 'Penjualan',
    amount: 182000,
    cogs: 128000,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 2)),
    items: {
      cart: [
        { name: 'Roti Tawar', qty: 2, price: 10000 },
        { name: 'Teh Pucuk Harum 350ml', qty: 3, price: 9000 },
      ],
    },
  },
  {
    label: 'Penjualan H-2 Malam',
    type: 'Masuk',
    category: 'Penjualan',
    amount: 215000,
    cogs: 149000,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 2)),

    items: {
      cart: [
        { name: 'Minyak Goreng 1L', qty: 2, price: 22000 },
        { name: 'Gula Pasir 1kg', qty: 1, price: 16000 },
        { name: 'Aqua 600ml', qty: 2, price: 7000 },
      ],
    },
  },
  {
    label: 'Penjualan H-1 Pagi',
    type: 'Masuk',
    category: 'Penjualan',
    amount: 324000,
    cogs: 228000,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 1)),

    items: {
      cart: [
        { name: 'Beras 5kg', qty: 1, price: 55000 },
        { name: 'Aqua 600ml', qty: 5, price: 7000 },
        { name: 'Teh Pucuk Harum 350ml', qty: 2, price: 9000 },
      ],
    },
  },
  {
    label: 'Penjualan H-1 Siang',
    type: 'Masuk',
    category: 'Penjualan',
    amount: 275000,
    cogs: 195000,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 1)),

    items: {
      cart: [
        { name: 'Mi Instan Indomie', qty: 6, price: 5500 },
        { name: 'Roti Tawar', qty: 1, price: 10000 },
        { name: 'Sabun Mandi', qty: 1, price: 11000 },
      ],
    },
  },
  {
    label: 'Penjualan H-1 Malam',
    type: 'Masuk',
    category: 'Penjualan',
    amount: 198000,
    cogs: 138000,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 1)),

    items: {
      cart: [
        { name: 'Susu UHT 1L', qty: 1, price: 26000 },
        { name: 'Shampoo 200ml', qty: 1, price: 18000 },
        { name: 'Odol Herbal', qty: 1, price: 12000 },
      ],
    },
  },
  {
    label: 'Penjualan H Pagi',
    type: 'Masuk',
    category: 'Penjualan',
    amount: 295000,
    cogs: 210000,
    createdAt: new Date(),

    items: {
      cart: [
        { name: 'Mi Instan Indomie', qty: 3, price: 5500 },
        { name: 'Aqua 600ml', qty: 4, price: 7000 },
        { name: 'Roti Tawar', qty: 1, price: 10000 },
      ],
    },
  },
  {
    label: 'Penjualan H Siang',
    type: 'Masuk',
    category: 'Penjualan',
    amount: 322000,
    cogs: 229000,
    createdAt: new Date(),

    items: {
      cart: [
        { name: 'Beras 5kg', qty: 1, price: 55000 },
        { name: 'Minyak Goreng 1L', qty: 1, price: 22000 },
        { name: 'Teh Pucuk Harum 350ml', qty: 3, price: 9000 },
      ],
    },
  },
  {
    label: 'Penjualan H Malam',
    type: 'Masuk',
    category: 'Penjualan',
    amount: 210000,
    cogs: 142000,
    createdAt: new Date(),

    items: {
      cart: [
        { name: 'Susu UHT 1L', qty: 1, price: 26000 },
        { name: 'Sabun Mandi', qty: 1, price: 11000 },
        { name: 'Odol Herbal', qty: 1, price: 12000 },
      ],
    },
  },
];

async function main() {
  console.log('Seeding dummy data...');

  const user = await prisma.user.findUnique({ where: { username: 'faried' } });
  if (!user) {
    console.error('User "faried" tidak ditemukan. Daftarkan akun faried dulu.');
    process.exit(1);
  }

  const orgId = user.organizationId;

  const categoryRecords = {};
  for (const category of categories) {
    const record = await prisma.category.upsert({
      where: { organizationId_name: { organizationId: orgId, name: category.name } },
      update: {},
      create: { ...category, organizationId: orgId },
    });
    categoryRecords[category.name] = record;
  }

  for (const product of products) {
    const existing = await prisma.product.findFirst({ where: { name: product.name, organizationId: orgId } });
    if (!existing) {
      await prisma.product.create({
        data: {
          name: product.name,
          category: product.category,
          categoryId: categoryRecords[product.category]?.id || null,
          organizationId: orgId,
          costPrice: product.costPrice,
          price: product.price,
          stock: product.stock,
          status: product.status,
        },
      });
    }
  }

  for (const transaction of transactions) {
    const existingTx = await prisma.transactions.findFirst({
      where: {
        label: transaction.label,
        amount: transaction.amount,
        createdAt: transaction.createdAt,
        organizationId: orgId,
      },
    });
    if (!existingTx) {
      await prisma.transactions.create({
        data: {
          organizationId: orgId,
          label: transaction.label,
          type: transaction.type,
          category: transaction.category,
          amount: transaction.amount,
          cogs: transaction.cogs,
          createdAt: transaction.createdAt,
          items: transaction.items,
        },
      });
    }
  }

  console.log('Dummy data inserted.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
