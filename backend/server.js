const express = require('express');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./src/routes/api');
const prisma = require('./src/config/db');
const authController = require('./src/controllers/authController');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('API Kelola.in berjalan mantap!');
});

app.use('/api', apiRoutes);

authController.initializeDefaultAdmin();

process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});