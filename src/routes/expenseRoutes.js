const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const {
  validateIdParam,
  validateCreateExpense,
  validateUpdateExpense,
  validatePartialUpdateExpense,
  validateQueryParams,
} = require('../middlewares/validateExpense');

// Summary statistics endpoint (placed before :id route)
router.get('/summary', expenseController.getExpenseSummary);

// Base /api/v1/expenses endpoints
router
  .route('/')
  .get(validateQueryParams, expenseController.getAllExpenses)
  .post(validateCreateExpense, expenseController.createExpense);

// ID-specific endpoints
router
  .route('/:id')
  .get(validateIdParam, expenseController.getExpenseById)
  .put(validateIdParam, validateUpdateExpense, expenseController.updateExpense)
  .patch(validateIdParam, validatePartialUpdateExpense, expenseController.partialUpdateExpense)
  .delete(validateIdParam, expenseController.deleteExpense);

module.exports = router;
