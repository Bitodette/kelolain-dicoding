const fs = require('fs').promises;
const path = require('path');
const prisma = require('../config/db');
const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');
const { asyncHandler } = require('../middlewares/errorHandler');

const AI_BASE_URL = process.env.AI_BASE_URL;
const RECEIPT_SCANNER_URL = process.env.RECEIPT_SCANNER_URL;
const CACHE_FILE = path.resolve(__dirname, '..', '..', 'ai-prediction-cache.json');
const MAX_DAILY_SCANS = 10;

// cache biar ga manggil ai terus tiap request
const defaultCache = {
    revenue: { key: null, data: null },
    demand: { key: null, data: null },
    bundling: { key: null, data: null },
};

const loadCacheFromFile = async () => {
    try {
        const raw = await fs.readFile(CACHE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return {
            revenue: parsed.revenue || defaultCache.revenue,
            demand: parsed.demand || defaultCache.demand,
            bundling: parsed.bundling || defaultCache.bundling,
        };
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error('Failed to load AI cache file:', err.message);
        }
        return { ...defaultCache };
    }
};

const saveCacheToFile = async (cacheData) => {
    try {
        await fs.writeFile(CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf8');
    } catch (err) {
        console.error('Failed to save AI cache file:', err.message);
    }
};

let cache = { ...defaultCache };
const initCache = async () => {
    cache = await loadCacheFromFile();
};
initCache();

const stableStringify = (value) => {
    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(',')}]`;
    }

    if (value && typeof value === 'object') {
        const sortedKeys = Object.keys(value).sort();
        return `{${sortedKeys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }

    return JSON.stringify(value);
};

const buildRevenueFallback = (revenueData) => {
    const lastValue = revenueData[2] || revenueData[1] || revenueData[0] || 0;
    return Array.from({ length: 7 }, () => lastValue);
};

const buildDemandFallback = (demandPayload) => {
    const items = Object.entries(demandPayload).map(([product, { demand, stock }]) => {
        const totalDemand = (Array.isArray(demand) ? demand : []).reduce((sum, value) => sum + (Number(value) || 0), 0);
        const averageDaily = totalDemand / 3 || 0;
        const lasting_day = averageDaily > 0 ? Math.max(1, Math.ceil((Number(stock) || 0) / averageDaily)) : 7;
        return { product, total_demand: totalDemand, lasting_day };
    });

    return items
        .sort((a, b) => a.lasting_day - b.lasting_day || b.total_demand - a.total_demand)
        .slice(0, 5);
};

const buildBundlingFallback = (bundlingData) => {
    const pairCounts = {};

    bundlingData.forEach((transaction) => {
        const products = Array.isArray(transaction) ? Array.from(new Set(transaction.map(String))) : [];
        products.sort();

        for (let i = 0; i < products.length; i += 1) {
            for (let j = i + 1; j < products.length; j += 1) {
                const key = `${products[i]}|||${products[j]}`;
                pairCounts[key] = (pairCounts[key] || 0) + 1;
            }
        }
    });

    return Object.entries(pairCounts)
        .filter(([, count]) => count >= 3)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([key, count]) => {
            const [left, right] = key.split('|||');
            return `${left} dan ${right} dibeli bersama ${count} kali.`;
        });
};

const safeAiRequest = async (url, payload) => {
    const aiResponse = await axios.post(url, payload, { timeout: 30000 });
    if (!aiResponse?.data || typeof aiResponse.data !== 'object') {
        throw new Error('Invalid AI response');
    }
    return aiResponse.data;
};

// --- prediksi & fallback (kalo ai mati) ---
exports.getRevenuePrediction = asyncHandler(async (req, res) => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (now.getHours() < 20) {
        today.setDate(today.getDate() - 1);
    }

    const dayQueries = [0, 1, 2, 3, 4, 5, 6].map((i) => {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - i);
        const nextDate = new Date(targetDate);
        nextDate.setDate(targetDate.getDate() + 1);

        return prisma.transactions.aggregate({
            _sum: { amount: true },
            where: {
                organizationId: req.user.organizationId,
                type: 'Masuk',
                createdAt: { gte: targetDate, lt: nextDate }
            }
        });
    });

    const results = await Promise.all(dayQueries);

    const nonZeroDays = [];
    results.forEach((result) => {
        const amount = result._sum.amount || 0;
        if (amount > 0) {
            nonZeroDays.push(amount);
        }
    });

    const revenueData = nonZeroDays.slice(0, 3).reverse();

    const payload = { data: revenueData };
    const cacheKey = stableStringify(payload);

    if (revenueData.length < 3) {
        const emptyResponse = { result: [], fallback: true, message: 'Data historis belum cukup untuk prediksi.' };
        cache.revenue.key = cacheKey;
        cache.revenue.data = emptyResponse;
        await saveCacheToFile(cache);
        return res.json(emptyResponse);
    }

    if (cache.revenue.key === cacheKey && cache.revenue.data) {
        return res.json(cache.revenue.data);
    }

    let aiResponse;

    try {
        aiResponse = await safeAiRequest(`${AI_BASE_URL}/predict/revenue`, payload);
    } catch (err) {
        console.error("AI Revenue fallback:", err.message, err.response ? { status: err.response.status, data: err.response.data } : undefined);
        aiResponse = { result: buildRevenueFallback(revenueData), fallback: true };
    }

    cache.revenue.key = cacheKey;
    cache.revenue.data = aiResponse;
    await saveCacheToFile(cache);

    res.json(aiResponse);
});

// PREDIKSI DEMAND (STOK)
exports.getDemandPrediction = asyncHandler(async (req, res) => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (now.getHours() < 20) {
        today.setDate(today.getDate() - 1);
    }

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    const products = await prisma.product.findMany({ where: { organizationId: req.user.organizationId } });
    
    const recentTransactions = await prisma.transactions.findMany({
        where: {
            organizationId: req.user.organizationId,
            type: 'Masuk',
            createdAt: { gte: sevenDaysAgo }
        }
    });

    const dayTxsMap = new Map();
    recentTransactions.forEach(tx => {
        if (!tx.items) return;
        const txDate = new Date(tx.createdAt);
        txDate.setHours(0, 0, 0, 0);
        const key = txDate.getTime();
        if (!dayTxsMap.has(key)) {
            dayTxsMap.set(key, []);
        }
        dayTxsMap.get(key).push(tx);
    });

    if (dayTxsMap.size < 3) {
        const emptyPayload = { data: null };
        const cacheKey = stableStringify(emptyPayload);
        const emptyResponse = { result: [], fallback: true, message: 'Data historis belum cukup untuk prediksi stok.' };
        cache.demand.key = cacheKey;
        cache.demand.data = emptyResponse;
        await saveCacheToFile(cache);
        return res.json(emptyResponse);
    }

    const sortedDays = Array.from(dayTxsMap.keys()).sort((a, b) => a - b);
    const recent3Days = sortedDays.slice(-3);

    const demandPayload = {};
    products.forEach(p => {
        demandPayload[p.name] = {
            demand: [0, 0, 0],
            stock: p.stock
        };
    });

    recent3Days.forEach((timestamp, idx) => {
        const dayTxs = dayTxsMap.get(timestamp);
        dayTxs.forEach(tx => {
            if (!tx.items) return;
            const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
            const cart = items.cart || [];
            cart.forEach(item => {
                if (demandPayload[item.name]) {
                    demandPayload[item.name].demand[idx] += (item.qty || 0);
                }
            });
        });
    });

    const payload = { data: demandPayload };
    const cacheKey = stableStringify(payload);

    if (cache.demand.key === cacheKey && cache.demand.data) {
        return res.json(cache.demand.data);
    }

    let aiResponse;

    try {
        aiResponse = await safeAiRequest(`${AI_BASE_URL}/predict/demand`, payload);
    } catch (err) {
        console.error("AI Demand fallback:", err.message, err.response ? { status: err.response.status, data: err.response.data } : undefined);
        aiResponse = { result: buildDemandFallback(demandPayload), fallback: true };
    }

    cache.demand.key = cacheKey;
    cache.demand.data = aiResponse;
    await saveCacheToFile(cache);

    res.json(aiResponse);
});

// rekomendasi bundling
exports.getBundlingSuggestion = asyncHandler(async (req, res) => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (now.getHours() < 20) {
        today.setDate(today.getDate() - 1);
    }

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    const transactions = await prisma.transactions.findMany({
        where: {
            organizationId: req.user.organizationId,
            type: 'Masuk',
            createdAt: { gte: sevenDaysAgo }
        },
        orderBy: { createdAt: 'desc' },
        take: 100 
    });

    const bundlingData = [];

    transactions.forEach(tx => {
        if (!tx.items) return;
        const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
        const cart = items.cart || [];
        const productNames = cart.map(item => item.name);
        
        if (productNames.length > 1) {
            bundlingData.push(productNames);
        }
    });

    const payload = { data: bundlingData };
    const cacheKey = stableStringify(payload);

    if (bundlingData.length < 3) {
        const emptyResponse = { result: [], fallback: true, message: 'Belum cukup transaksi untuk rekomendasi bundling.' };
        cache.bundling.key = cacheKey;
        cache.bundling.data = emptyResponse;
        await saveCacheToFile(cache);
        return res.json(emptyResponse);
    }

    if (cache.bundling.key === cacheKey && cache.bundling.data) {
        return res.json(cache.bundling.data);
    }

    let aiResponse;

    try {
        aiResponse = await safeAiRequest(`${AI_BASE_URL}/bundling`, payload);

        cache.bundling.key = cacheKey;
        cache.bundling.data = aiResponse;
        await saveCacheToFile(cache);
    } catch (err) {
        console.error("AI Bundling error:", err.message);

        if (cache.bundling.data) {
            return res.json(cache.bundling.data);
        }

        throw err;
    }

    res.json(aiResponse);
});

// cek quota scan harian (10x/user/hari)
const checkScanLimit = async (userId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { scanCount: true, scanDate: true } });

    if (!user.scanDate || new Date(user.scanDate).getTime() < today.getTime()) {
        return { allowed: true, remaining: MAX_DAILY_SCANS, scanCount: 0 };
    }

    if (user.scanCount >= MAX_DAILY_SCANS) {
        return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: MAX_DAILY_SCANS - user.scanCount, scanCount: user.scanCount };
};

// baru dihitung kalo beneran sukses scan
const incrementScanCount = async (userId, currentScanCount) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextCount = currentScanCount + 1;
    await prisma.user.update({
        where: { id: userId },
        data: { scanCount: nextCount, scanDate: today },
    });
};

// compress biar ga gede2 amat dikirim ke ai
const compressImage = async (buffer) => {
    try {
        const compressed = await sharp(buffer)
            .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
        return { buffer: compressed, mimetype: 'image/jpeg', ext: '.jpg' };
    } catch {
        return { buffer, mimetype: null, ext: null };
    }
};

const createAiFormData = (file, compressed) => {
    const fd = new FormData();
    const buf = compressed?.buffer || file.buffer;
    const ext = compressed?.ext || '.jpg';
    const mime = compressed?.mimetype || file.mimetype;
    const name = file.originalname.replace(/\.[^.]+$/, '') + ext;
    fd.append('file', buf, { filename: name, contentType: mime });
    return fd;
};

const postToAi = async (url, formData) => {
    const response = await axios.post(url, formData, {
        headers: { ...formData.getHeaders() },
    });
    return response.data;
};

// ping tiap 14 menit biar railway ga tidur
const warmAiServices = async () => {
    try {
        await axios.get(`${AI_BASE_URL}/predict/blur`, { signal: AbortSignal.timeout(10000) });
    } catch { /* ignore */ }
    try {
        await axios.get(`${RECEIPT_SCANNER_URL}/extract-text`, { signal: AbortSignal.timeout(10000) });
    } catch { /* ignore */ }
};
// Ping every 14 minutes (Render free tier sleeps after 15 min idle)
setInterval(warmAiServices, 14 * 60 * 1000);
// Warm on startup
setTimeout(warmAiServices, 5000);

// scan struk -> blur check -> ocr extract
exports.scanReceipt = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No receipt image uploaded.' });
    }

    const limit = await checkScanLimit(req.user.id);
    if (!limit.allowed) {
        return res.status(429).json({ message: 'Anda telah mencapai batas maksimal 10 scan struk per hari.' });
    }

    try {
        // 1. cek blur
        const blurFormData = new FormData();
        blurFormData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        let isBlurry = false;
        try {
            const blurRes = await axios.post(`${AI_BASE_URL}/predict/blur`, blurFormData, {
                headers: blurFormData.getHeaders(),
                timeout: 15000,
            });
            isBlurry = blurRes.data?.prediction === 'blurry';
        } catch (err) {
            console.error('Blur check AI service error:', err.message);
        }

        if (isBlurry) {
            return res.status(422).json({
                message: 'Gambar struk buram atau tidak jelas. Silakan coba lagi.',
                error: 'blurry_image',
            });
        }

        // 2. extract text
        const extractFormData = new FormData();
        extractFormData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        const extractResponse = await axios.post(`${RECEIPT_SCANNER_URL}/extract-text`, extractFormData, {
            headers: extractFormData.getHeaders(),
            timeout: 120000,
        });

        const extractData = extractResponse.data || {};
        const rawItems = Array.isArray(extractData.items) ? extractData.items : Array.isArray(extractData.result) ? extractData.result : [];
        const items = rawItems.map((item) => ({
            name: item.name || item.item_name || item.product_name || item.description || '',
            price: item.price || item.price_text || item.harga || '',
            quantity: item.quantity || item.qty || item.quantity_text || '',
            raw: item,
        }));

        await incrementScanCount(req.user.id, limit.scanCount);

        res.json({ items, raw: extractData, remaining: limit.remaining - 1 });
    } catch (error) {
        console.error('Error during receipt scan:', error.message);

        if (error.response) {
            console.error('Error response data:', error.response.data);
            return res.status(error.response.status || 500).json({
                message: 'Gagal memproses struk.',
                error: error.response.data,
            });
        }

        res.status(500).json({
            message: 'Terjadi kesalahan internal saat memproses struk.',
        });
    }
});

exports.checkReceiptBlur = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No receipt image uploaded.' });
    }

    try {
        const blurFormData = new FormData();
        blurFormData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        const blurResponse = await axios.post(`${AI_BASE_URL}/predict/blur`, blurFormData, {
            headers: blurFormData.getHeaders(),
        });

        res.json({ prediction: blurResponse.data?.prediction || 'unknown' });
    } catch (error) {
        console.error('Error during blur check:', error.message);
        res.status(500).json({ message: 'Gagal memeriksa ketajaman struk.' });
    }
});