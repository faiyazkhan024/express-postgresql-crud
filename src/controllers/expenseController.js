const Expense = require('../models/expenseModel');

/**
 * Controller handling expense API requests
 */
const expenseController = {
  /**
   * POST /api/v1/expenses
   */
  async createExpense(req, res) {
    const { title, amount, category, expense_date, payment_method, status, notes } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Title is required and must be a non-empty string',
      });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount is required and must be a positive number',
      });
    }

    if (!category || typeof category !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Category is required',
      });
    }

    try {
      const expense = await Expense.create({
        title,
        amount: parsedAmount,
        category,
        expense_date,
        payment_method,
        status,
        notes,
      });

      return res.status(201).json({
        success: true,
        message: 'Expense created successfully',
        data: expense,
      });
    } catch (err) {
      console.error('Error creating expense:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error while creating expense',
        detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  },

  /**
   * GET /api/v1/expenses
   */
  async getAllExpenses(req, res) {
    try {
      const { category, status, sortBy, sortOrder } = req.query;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;

      const result = await Expense.findAll({
        category,
        status,
        page,
        limit,
        sortBy,
        sortOrder,
      });

      return res.status(200).json({
        success: true,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
        data: result.data,
      });
    } catch (err) {
      console.error('Error retrieving expenses:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error while fetching expenses',
        detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  },

  /**
   * GET /api/v1/expenses/:id
   */
  async getExpenseById(req, res) {
    const expenseId = parseInt(req.params.id, 10);
    if (isNaN(expenseId) || expenseId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid expense ID. ID must be a positive integer.',
      });
    }

    try {
      const expense = await Expense.findById(expenseId);
      if (!expense) {
        return res.status(404).json({
          success: false,
          error: `Expense with ID ${expenseId} not found`,
        });
      }

      return res.status(200).json({
        success: true,
        data: expense,
      });
    } catch (err) {
      console.error('Error retrieving expense by ID:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error while fetching expense',
        detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  },

  /**
   * GET /api/v1/expenses/summary
   */
  async getExpenseSummary(req, res) {
    try {
      const summary = await Expense.getSummary();
      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (err) {
      console.error('Error fetching expense summary:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error while fetching summary',
        detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  },

  /**
   * PUT /api/v1/expenses/:id
   */
  async updateExpense(req, res) {
    const expenseId = parseInt(req.params.id, 10);
    if (isNaN(expenseId) || expenseId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid expense ID. ID must be a positive integer.',
      });
    }

    const { title, amount, category, expense_date, payment_method, status, notes } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Title is required and must be a non-empty string',
      });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount is required and must be a positive number',
      });
    }

    if (!category || typeof category !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Category is required',
      });
    }

    try {
      const updated = await Expense.update(expenseId, {
        title,
        amount: parsedAmount,
        category,
        expense_date,
        payment_method,
        status,
        notes,
      });

      if (!updated) {
        return res.status(404).json({
          success: false,
          error: `Expense with ID ${expenseId} not found`,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Expense updated successfully',
        data: updated,
      });
    } catch (err) {
      console.error('Error updating expense with PUT:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error while updating expense',
        detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  },

  /**
   * PATCH /api/v1/expenses/:id
   */
  async partialUpdateExpense(req, res) {
    const expenseId = parseInt(req.params.id, 10);
    if (isNaN(expenseId) || expenseId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid expense ID. ID must be a positive integer.',
      });
    }

    const allowedFields = ['title', 'amount', 'category', 'expense_date', 'payment_method', 'status', 'notes'];
    const fields = Object.keys(req.body).filter(field => allowedFields.includes(field));

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one valid field must be provided for update',
      });
    }

    if (req.body.title !== undefined) {
      if (typeof req.body.title !== 'string' || req.body.title.trim() === '') {
        return res.status(400).json({ success: false, error: 'Title must be a non-empty string' });
      }
    }

    if (req.body.amount !== undefined) {
      const parsed = parseFloat(req.body.amount);
      if (isNaN(parsed) || parsed <= 0) {
        return res.status(400).json({ success: false, error: 'Amount must be a positive number' });
      }
      req.body.amount = parsed;
    }

    try {
      const updated = await Expense.partialUpdate(expenseId, req.body);
      if (!updated) {
        return res.status(404).json({
          success: false,
          error: `Expense with ID ${expenseId} not found`,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Expense partially updated successfully',
        data: updated,
      });
    } catch (err) {
      console.error('Error updating expense with PATCH:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error while updating expense',
        detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  },

  /**
   * DELETE /api/v1/expenses/:id
   */
  async deleteExpense(req, res) {
    const expenseId = parseInt(req.params.id, 10);
    if (isNaN(expenseId) || expenseId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid expense ID. ID must be a positive integer.',
      });
    }

    try {
      const deleted = await Expense.delete(expenseId);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: `Expense with ID ${expenseId} not found`,
        });
      }

      return res.status(204).send();
    } catch (err) {
      console.error('Error deleting expense:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error while deleting expense',
        detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  },
};

module.exports = expenseController;
