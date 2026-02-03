const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');
const { validateEmployeeCreate, validateEmployeeUpdate } = require('../middleware/validate');

router.use(authMiddleware);
router.use(requireAdmin);

router.get('/', employeeController.getEmployees);
router.get('/:id', employeeController.getEmployee);
router.post('/', validateEmployeeCreate, employeeController.createEmployee);
router.put('/:id', validateEmployeeUpdate, employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);
router.get('/:id/performance', employeeController.getPerformance);
router.post('/:id/reset-password', employeeController.resetPassword);

module.exports = router;
