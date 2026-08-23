import axios from 'axios';

// Cache GET in-memory dengan TTL + dedupe request yang sedang berjalan.
// Tujuannya: pindah tab tidak perlu fetch ulang data yang sama berkali-kali.

const DEFAULT_TTL_MS = 60 * 1000;
const LONG_TTL_MS = 5 * 60 * 1000;
const AI_TTL_MS = 2 * 60 * 1000;

const cache = new Map();

function buildKey(url, params) {
    return params ? `${url}|${JSON.stringify(params)}` : url;
}

export function cachedGet(url, { params, signal, ttl = DEFAULT_TTL_MS } = {}) {
    const key = buildKey(url, params);
    const entry = cache.get(key);

    if (entry?.data && Date.now() - entry.fetchedAt < ttl) {
        return Promise.resolve(entry.data);
    }
    // Hanya pemanggil tanpa signal yang boleh berbagi request in-flight,
    // supaya abort dari satu pemanggil tidak merusak pemanggil lain.
    if (!signal && entry?.inflight) {
        return entry.inflight;
    }

    const request = axios
        .get(url, { params, signal })
        .then((response) => {
            cache.set(key, { data: response.data, fetchedAt: Date.now(), inflight: null });
            return response.data;
        })
        .catch((error) => {
            const current = cache.get(key);
            if (!signal && current?.inflight === request) {
                cache.delete(key);
            }
            throw error;
        });

    if (!signal) {
        cache.set(key, { inflight: request });
    }
    return request;
}

export function invalidateApiCache(...prefixes) {
    if (prefixes.length === 0) {
        cache.clear();
        return;
    }
    for (const key of [...cache.keys()]) {
        if (prefixes.some((prefix) => key.startsWith(prefix))) {
            cache.delete(key);
        }
    }
}

export const TTL = {
    default: DEFAULT_TTL_MS,
    long: LONG_TTL_MS,
    ai: AI_TTL_MS,
};

// Kelompok endpoint yang datanya saling terpengaruh saat ada perubahan.
export const CACHE_PREFIXES = {
    transactions: ['/api/transactions', '/api/dashboard', '/api/finance', '/api/ai'],
    products: ['/api/products', '/api/categories', '/api/dashboard'],
};
