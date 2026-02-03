const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

const validateLogin = [
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    handleValidationErrors
];

const validateCustomer = [
    body('customer_name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('phone').matches(/^\d{10,15}$/).withMessage('Valid phone number required (10-15 digits)'),
    body('alternate_number').optional({ checkFalsy: true }).matches(/^\d{10,15}$/).withMessage('Valid alternate number required'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email required').normalizeEmail(),
    // Fixed: Removed withMessage after trim(), as trim() is a sanitizer
    body('investment_id').optional({ checkFalsy: true }).trim(),
    body('investment_code').optional({ checkFalsy: true }).trim(),
    body('invested_date').optional({ checkFalsy: true }).isISO8601().withMessage('Valid date required'),
    body('cheque_no').optional({ checkFalsy: true }).trim(),
    body('status').optional().isIn(['Active', 'Closed', 'Hold']).withMessage('Invalid status'),
    handleValidationErrors
];

const validateCallLog = [
    body('customer_id').isInt({ min: 1 }).withMessage('Valid customer required'),
    body('call_datetime').isISO8601().withMessage('Valid datetime required'),
    body('call_type').isIn(['Incoming', 'Outgoing', 'Incoming (Missed Call)', 'Outgoing (Busy)', 'Outgoing (Not Reachable)']).withMessage('Invalid call type'),
    body('call_purpose').isIn(['Payment Refund', 'KYC Update', 'Payout 2025', 'Payout 2024', 'Cheque Issued (Refund Date)', 'New Cheque Issued for Renewal', 'New Cheque for Refund (Altered Date)', 'NCD Document', 'NCD Payout', 'Appointments', 'Others']).withMessage('Invalid call purpose'),
    body('priority').isIn(['Emergency', 'Important', 'Manageable', 'Appointments']).withMessage('Invalid priority'),
    body('call_status').optional().isIn(['Connected', 'Not Answered', 'Busy']).withMessage('Invalid call status'),
    body('notes').trim().isLength({ min: 10, max: 1000 }).withMessage('Notes must be 10-1000 characters'),
    body('call_duration').optional().isInt({ min: 0 }).withMessage('Duration must be a positive integer'),
    body('next_followup_date').optional({ checkFalsy: true }).isISO8601().withMessage('Valid followup date required'),
    handleValidationErrors
];

const validateEmployeeCreate = [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('mobile').matches(/^\d{10,15}$/).withMessage('Valid mobile number required'),
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['Admin', 'Agent']).withMessage('Invalid role'),
    body('status').optional().isIn(['Active', 'Inactive']).withMessage('Invalid status'),
    handleValidationErrors
];

const validateEmployeeUpdate = [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('mobile').matches(/^\d{10,15}$/).withMessage('Valid mobile number required'),
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('role').optional().isIn(['Admin', 'Agent']).withMessage('Invalid role'),
    body('status').optional().isIn(['Active', 'Inactive']).withMessage('Invalid status'),
    handleValidationErrors
];

module.exports = {
    validateLogin,
    validateCustomer,
    validateCallLog,
    validateEmployeeCreate,
    validateEmployeeUpdate,
    handleValidationErrors
};
