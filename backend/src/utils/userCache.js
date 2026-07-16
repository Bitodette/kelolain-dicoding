const prisma = require('../config/db');
const { Redis } = require('@upstash/redis');

const CACHE_TTL_SEC = 60;
const KEY_PREFIX = 'kelolain:user:';
const ORG_SET_PREFIX = 'kelolain:org:';

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
            const pipeline = redis.pipeline();
            pipeline.set(KEY_PREFIX + userId, JSON.stringify(user), { ex: CACHE_TTL_SEC });
            if (user.organizationId) {
                pipeline.sadd(ORG_SET_PREFIX + user.organizationId, String(userId));
                pipeline.expire(ORG_SET_PREFIX + user.organizationId, CACHE_TTL_SEC);
            }
            await pipeline.exec();
        } catch { /* Redis down, skip cache, data still correct */ }
    }

    return user;
}

function invalidateUser(userId) {
    redis.del(KEY_PREFIX + userId).catch(() => {});
}

function invalidateOrgUsers(organizationId) {
    const setKey = ORG_SET_PREFIX + organizationId;
    redis.smembers(setKey).then((userIds) => {
        if (!userIds || !userIds.length) return;
        const pipeline = redis.pipeline();
        for (const uid of userIds) {
            pipeline.del(KEY_PREFIX + uid);
        }
        pipeline.del(setKey);
        pipeline.exec().catch(() => {});
    }).catch(() => {});
}

module.exports = { getCachedUser, fetchAndCacheUser, invalidateUser, invalidateOrgUsers };
