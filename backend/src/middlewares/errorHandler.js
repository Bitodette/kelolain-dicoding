const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const errorHandler = (err, req, res, next) => {
    console.error(err);

    if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Data tidak ditemukan' });
    }

    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token tidak valid' });
    }

    const status = err.status || 500;
    const message = err.message || 'Terjadi kesalahan pada server';
    res.status(status).json({ error: message });
};

module.exports = { asyncHandler, errorHandler };