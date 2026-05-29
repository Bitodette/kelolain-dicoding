const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const apiRoutes = require('./src/routes/api');
const prisma = require('./src/config/db');
const { errorHandler } = require('./src/middlewares/errorHandler');

const app = express();

// needed for rate limiter behind render/vercel proxy
app.set('trust proxy', 1);
app.use(helmet());

app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: 'Terlalu banyak permintaan. Coba lagi nanti.' },
});
app.use('/api', apiLimiter);

app.get('/', (req, res) => {
    res.send('API Kelola.in berjalan mantap!');
});

app.use('/api', apiRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});

process.on('SIGINT', async () => {
    server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
});