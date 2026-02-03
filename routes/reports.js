const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/employee-performance', reportController.getEmployeePerformance);
router.get('/purpose-summary', reportController.getPurposeSummary);
router.get('/call-trends', reportController.getCallTrends);
router.get('/missed-calls', reportController.getMissedCalls);
router.get('/pending-followups', reportController.getPendingFollowups);
router.get('/customer-engagement', reportController.getCustomerEngagement);

module.exports = router;
