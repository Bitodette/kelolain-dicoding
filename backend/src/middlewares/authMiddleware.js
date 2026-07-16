const jwt = require('jsonwebtoken');
const { getCachedUser, fetchAndCacheUser } = require('../utils/userCache');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('JWT_SECRET tidak diatur di environment variables.');
    process.exit(1);
}

exports.authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
        return res.status(401).json({ error: 'Token tidak ditemukan' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = Number(decoded.sub);
        if (!Number.isFinite(userId)) {
            return res.status(401).json({ error: 'Token tidak valid' });
        }

        let user = await getCachedUser(userId);
        if (!user) {
            user = await fetchAndCacheUser(userId);
        }

        if (!user || !user.active) {
            return res.status(401).json({ error: 'Pengguna tidak ditemukan atau tidak aktif' });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error(err.message);
        return res.status(401).json({ error: 'Token tidak valid' });
    }
};
