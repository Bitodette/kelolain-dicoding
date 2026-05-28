const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const prisma = require('../config/db');
const supabase = require('../config/supabase');
const axios = require('axios');
const FormData = require('form-data');

const AI_BASE_URL = 'https://kelolain-ai-model-api.up.railway.app';
const RECEIPT_SCANNER_URL = 'https://kelolain-receipt-scanner.up.railway.app';
const CACHE_FILE = path.resolve(__dirname, '..', '..', 'ai-prediction-cache.json');

const defaultCache = {
    revenue: { key: null, data: null },
    demand: { key: null, data: null },
    bundling: { key: null, data: null },
};

const loadCacheFromFile = () => {
    try {
        if (!fs.existsSync(CACHE_FILE)) {
            return { ...defaultCache };
        }

        const raw = fs.readFileSync(CACHE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return {
            revenue: parsed.revenue || defaultCache.revenue,
            demand: parsed.demand || defaultCache.demand,
            bundling: parsed.bundling || defaultCache.bundling,
        };
    } catch (err) {
        console.error('Failed to load AI cache file:', err.message);
        return { ...defaultCache };
    }
};

const saveCacheToFile = (cacheData) => {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf8');
    } catch (err) {
        console.error('Failed to save AI cache file:', err.message);
    }
};

let cache = loadCacheFromFile();

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
    const aiResponse = await axios.post(url, payload);
    if (!aiResponse?.data || typeof aiResponse.data !== 'object') {
        throw new Error('Invalid AI response');
    }
    return aiResponse.data;
};

// PREDIKSI REVENUE
exports.getRevenuePrediction = async (req, res) => {
    try {
        // Ambil data 3 hari ke belakang
        const revenueData = [0, 0, 0];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 3; i++) {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() - (2 - i));
            
            const nextDate = new Date(targetDate);
            nextDate.setDate(targetDate.getDate() + 1);

            const result = await prisma.transactions.aggregate({
                _sum: { amount: true },
                where: {
                    organizationId: req.user.organizationId,
                    type: 'Masuk',
                    createdAt: {
                        gte: targetDate,
                        lt: nextDate
                    }
                }
            });
            revenueData[i] = result._sum.amount || 0;
        }

        const payload = { data: revenueData };
        const cacheKey = stableStringify(payload);

        const nonZeroDays = revenueData.filter((value) => Number(value) > 0).length;
        if (nonZeroDays < 3) {
            const emptyResponse = { result: [], fallback: true, message: 'Data historis belum cukup untuk prediksi.' };
            cache.revenue.key = cacheKey;
            cache.revenue.data = emptyResponse;
            saveCacheToFile(cache);
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
        saveCacheToFile(cache);

        res.json(aiResponse);
    } catch (err) {
        console.error("AI Revenue Error:", err.message, err.response ? { status: err.response.status, data: err.response.data } : undefined);
        res.status(500).json({ error: 'Gagal memuat prediksi pendapatan', details: err.response?.data || err.message });
    }
};

// PREDIKSI DEMAND (STOK)
exports.getDemandPrediction = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(today.getDate() - 2);

        const products = await prisma.product.findMany({ where: { organizationId: req.user.organizationId } });
        
        const recentTransactions = await prisma.transactions.findMany({
            where: {
                organizationId: req.user.organizationId,
                type: 'Masuk',
                createdAt: { gte: threeDaysAgo }
            }
        });

        const demandPayload = {};

        products.forEach(p => {
            demandPayload[p.name] = {
                demand: [0, 0, 0],
                stock: p.stock
            };
        });

        // hitung barang yang terjual per hari
        recentTransactions.forEach(tx => {
            if (!tx.items) return;
            const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
            const cart = items.cart || [];

            const txDate = new Date(tx.createdAt);
            txDate.setHours(0, 0, 0, 0);
            const dayIndex = Math.floor((txDate.getTime() - threeDaysAgo.getTime()) / (1000 * 60 * 60 * 24));

            if (dayIndex >= 0 && dayIndex <= 2) {
                cart.forEach(item => {
                    if (demandPayload[item.name]) {
                        demandPayload[item.name].demand[dayIndex] += (item.qty || 0);
                    }
                });
            }
        });

        const payload = { data: demandPayload };
        const cacheKey = stableStringify(payload);

        const transactionDays = new Set(recentTransactions.map((tx) => {
            const txDate = new Date(tx.createdAt);
            txDate.setHours(0, 0, 0, 0);
            return txDate.getTime();
        }));

        if (transactionDays.size < 3) {
            const emptyResponse = { result: [], fallback: true, message: 'Data historis belum cukup untuk prediksi stok.' };
            cache.demand.key = cacheKey;
            cache.demand.data = emptyResponse;
            saveCacheToFile(cache);
            return res.json(emptyResponse);
        }

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
        saveCacheToFile(cache);

        res.json(aiResponse);
    } catch (err) {
        console.error("AI Demand Error:", err.message, err.response ? { status: err.response.status, data: err.response.data } : undefined);
        res.status(500).json({ error: 'Gagal memuat prediksi stok', details: err.response?.data || err.message });
    }
};

// REKOMENDASI BUNDLING
exports.getBundlingSuggestion = async (req, res) => {
    try {
        const transactions = await prisma.transactions.findMany({
            where: { organizationId: req.user.organizationId, type: 'Masuk' },
            orderBy: { createdAt: 'desc' },
            take: 100 
        });

        const bundlingData = [];

        transactions.forEach(tx => {
            if (!tx.items) return;
            const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
            const cart = items.cart || [];
            const productNames = cart.map(item => item.name);
            
            // minimal beli 2 barang untuk masuk ke bundling
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
            saveCacheToFile(cache);
            return res.json(emptyResponse);
        }

        if (cache.bundling.key === cacheKey && cache.bundling.data) {
            return res.json(cache.bundling.data);
        }

        let aiResponse;

        try {
            aiResponse = await safeAiRequest(`${AI_BASE_URL}/bundling`, payload);
        } catch (err) {
            console.error("AI Bundling fallback:", err.message, err.response ? { status: err.response.status, data: err.response.data } : undefined);
            aiResponse = { result: buildBundlingFallback(bundlingData), fallback: true };
        }

        cache.bundling.key = cacheKey;
        cache.bundling.data = aiResponse;
        saveCacheToFile(cache);

        res.json(aiResponse);
    } catch (err) {
        console.error("AI Bundling Error:", err.message, err.response ? { status: err.response.status, data: err.response.data } : undefined);
        res.status(500).json({ error: 'Gagal memuat rekomendasi bundling', details: err.response?.data || err.message });
    }
};

// SCAN RECEIPT
exports.scanReceipt = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No receipt image uploaded.' });
    }

    try {
        // 1. Check for blur
        const blurFormData = new FormData();
        blurFormData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        const blurResponse = await axios.post(`${AI_BASE_URL}/predict/blur`, blurFormData, {
            headers: {
                ...blurFormData.getHeaders(),
            },
        });

        const isBlurry = blurResponse.data?.prediction === 'blurry';

        if (isBlurry) {
            return res.status(422).json({
                message: 'Gambar struk buram atau tidak jelas. Silakan coba lagi.',
                error: 'blurry_image',
            });
        }

        // 1.5. Upload receipt image to Supabase storage and metadata table
        try {
            const fileName = `${Date.now()}_${randomUUID()}_${req.file.originalname}`;
            const storagePath = `receipts/${fileName}`;

            const { error: uploadError } = await supabase.storage.from('receipts').upload(storagePath, req.file.buffer, {
                contentType: req.file.mimetype,
                cacheControl: '3600',
                upsert: false,
            });
            if (uploadError) {
                console.error('Supabase storage upload error:', uploadError);
            } else {
                const { data: publicUrlData, error: urlError } = supabase.storage.from('receipts').getPublicUrl(storagePath);
                if (urlError) {
                    console.error('Supabase get public URL error:', urlError);
                }

                const publicUrl = publicUrlData?.publicUrl || null;
                const receiptRecord = {
                    user_id: req.user?.id ? String(req.user.id) : null,
                    organization_id: req.user?.organizationId ? String(req.user.organizationId) : null,
                    file_name: req.file.originalname,
                    storage_path: storagePath,
                    public_url: publicUrl,
                    size: req.file.size,
                    content_type: req.file.mimetype,
                };

                const { error: insertError } = await supabase.from('receipts').insert([receiptRecord]);
                if (insertError) {
                    console.error('Supabase receipts table insert error:', insertError);
                }
            }
        } catch (uploadErr) {
            console.error('Supabase receipt upload exception:', uploadErr);
        }

        // 2. If not blurry, extract data
        const extractFormData = new FormData();
        extractFormData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        const extractResponse = await axios.post(`${RECEIPT_SCANNER_URL}/extract-text`, extractFormData, {
            headers: {
                ...extractFormData.getHeaders(),
            },
        });

        const extractData = extractResponse.data || {};
        const rawItems = Array.isArray(extractData.items) ? extractData.items : Array.isArray(extractData.result) ? extractData.result : [];
        const items = rawItems.map((item) => ({
            name: item.name || item.item_name || item.product_name || item.description || '',
            price: item.price || item.price_text || item.harga || '',
            quantity: item.quantity || item.qty || item.quantity_text || '',
            raw: item,
        }));

        res.json({ items, raw: extractData });
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
};

exports.checkReceiptBlur = async (req, res) => {
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
            headers: {
                ...blurFormData.getHeaders(),
            },
        });

        res.json({ prediction: blurResponse.data?.prediction || 'unknown' });
    } catch (error) {
        console.error('Error during blur check:', error.message);
        res.status(500).json({ message: 'Gagal memeriksa ketajaman struk.' });
    }
};