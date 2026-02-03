const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');
const { validateCustomer } = require('../middleware/validate');

router.use(authMiddleware);

router.get('/', customerController.getCustomers);
router.get('/search', customerController.searchCustomers);
router.get('/check-mobile', customerController.checkMobile);
router.get('/:id', customerController.getCustomer);
router.post('/', requireAdmin, validateCustomer, customerController.createCustomer);
router.put('/:id', requireAdmin, validateCustomer, customerController.updateCustomer);
router.delete('/:id', requireAdmin, customerController.deleteCustomer);
router.get('/:id/calls', customerController.getCustomerCalls);

module.exports = router;
