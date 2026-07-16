const authorize = (...requiredPages) => {
    return (req, res, next) => {
        if (!req.user || !req.user.roles) {
            return res.status(403).json({ error: 'Tidak ada akses' });
        }

        const allowedPages = Array.from(
            new Set(
                req.user.roles
                    .flatMap((ur) => ur.role?.pages || [])
                    .filter((page) => typeof page === 'string')
            )
        );

        const hasAccess = requiredPages.some((page) => allowedPages.includes(page));
        if (!hasAccess) {
            return res.status(403).json({ error: 'Anda tidak memiliki akses ke halaman ini' });
        }

        next();
    };
};

module.exports = { authorize };
