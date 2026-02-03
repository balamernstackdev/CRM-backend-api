const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');

router.use(authMiddleware);

router.get('/admin', requireAdmin, dashboardController.getAdminDashboard);
router.get('/employee', dashboardController.getEmployeeDashboard);

module.exports = router;
