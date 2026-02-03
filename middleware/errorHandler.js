const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: err.errors
        });
    }

    if (err.name === 'SqliteError') {
        if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(400).json({
                success: false,
                message: 'Database constraint violation. Duplicate entry or invalid reference.'
            });
        }
    }

    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;
