const prisma = require('../config/db');
const { Redis } = require('@upstash/redis');

const CACHE_TTL_SEC = 60;
const KEY_PREFIX = 'kelolain:user:';

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function getCachedUser(userId) {
    try {
        const raw = await redis.get(KEY_PREFIX + userId);
        return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
    } catch {
        return null;
    }
}

async function fetchAndCacheUser(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { role: true } }, organization: true },
    });

    if (user) {
        try {
            await redis.set(KEY_PREFIX + userId, JSON.stringify(user), { ex: CACHE_TTL_SEC });
        } catch { /* Redis down, skip cache, data still correct */ }
    }

    return user;
}

function invalidateUser(userId) {
    redis.del(KEY_PREFIX + userId).catch(() => {});
}

function invalidateOrgUsers(organizationId) {
    redis.keys(KEY_PREFIX + '*').then((keys) => {
        if (!keys || !keys.length) return;
        Promise.all(keys.map((k) => redis.get(k))).then((values) => {
            const toDelete = keys.filter((_, i) => {
                try {
                    const u = typeof values[i] === 'string' ? JSON.parse(values[i]) : values[i];
                    return u && u.organizationId === organizationId;
                } catch { return false; }
            });
            if (toDelete.length) {
                Promise.all(toDelete.map((k) => redis.del(k))).catch(() => {});
            }
        });
    }).catch(() => {});
}

module.exports = { getCachedUser, fetchAndCacheUser, invalidateUser, invalidateOrgUsers };
