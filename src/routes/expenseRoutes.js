const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');

// Summary statistics endpoint (placed before :id route)
router.get('/summary', expenseController.getExpenseSummary);

// Base /api/v1/expenses endpoints
router
  .route('/')
  .get(expenseController.getAllExpenses)
  .post(expenseController.createExpense);

// ID-specific endpoints
router
  .route('/:id')
  .get(expenseController.getExpenseById)
  .put(expenseController.updateExpense)
  .patch(expenseController.partialUpdateExpense)
  .delete(expenseController.deleteExpense);

module.exports = router;
