const express = require('express');
const router = express.Router();
const callLogController = require('../controllers/callLogController');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');
const { validateCallLog } = require('../middleware/validate');

router.use(authMiddleware);

router.get('/', callLogController.getCallLogs);
router.get('/my-logs', callLogController.getMyLogs);
router.get('/stats', callLogController.getStats);
router.get('/:id', callLogController.getCallLog);
router.post('/', validateCallLog, callLogController.createCallLog);
router.put('/:id', validateCallLog, callLogController.updateCallLog);
router.delete('/:id', requireAdmin, callLogController.deleteCallLog);

module.exports = router;
