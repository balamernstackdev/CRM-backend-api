const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'Admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
    next();
};

const requireAgent = (req, res, next) => {
    if (req.user.role !== 'Agent' && req.user.role !== 'Admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied.'
        });
    }
    next();
};

module.exports = { requireAdmin, requireAgent };
