const Expense = require('../models/expenseModel');
const AppError = require('../errors/AppError');

/**
 * Controller handling expense API requests
 */
const expenseController = {
  /**
   * POST /api/v1/expenses
   */
  async createExpense(req, res, next) {
    try {
      const { title, amount, category, expense_date, payment_method, status, notes } = req.body;
      const expense = await Expense.create({
        title,
        amount: parseFloat(amount),
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
      next(err);
    }
  },

  /**
   * GET /api/v1/expenses
   */
  async getAllExpenses(req, res, next) {
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
      next(err);
    }
  },

  /**
   * GET /api/v1/expenses/:id
   */
  async getExpenseById(req, res, next) {
    try {
      const expenseId = req.params.id;
      const expense = await Expense.findById(expenseId);

      if (!expense) {
        return next(new AppError(`Expense with ID ${expenseId} not found`, 404));
      }

      return res.status(200).json({
        success: true,
        data: expense,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/expenses/summary
   */
  async getExpenseSummary(req, res, next) {
    try {
      const summary = await Expense.getSummary();
      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/v1/expenses/:id
   */
  async updateExpense(req, res, next) {
    try {
      const expenseId = req.params.id;
      const { title, amount, category, expense_date, payment_method, status, notes } = req.body;

      const updated = await Expense.update(expenseId, {
        title,
        amount: parseFloat(amount),
        category,
        expense_date,
        payment_method,
        status,
        notes,
      });

      if (!updated) {
        return next(new AppError(`Expense with ID ${expenseId} not found`, 404));
      }

      return res.status(200).json({
        success: true,
        message: 'Expense updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/v1/expenses/:id
   */
  async partialUpdateExpense(req, res, next) {
    try {
      const expenseId = req.params.id;
      const updates = { ...req.body };

      if (updates.amount !== undefined) {
        updates.amount = parseFloat(updates.amount);
      }

      const updated = await Expense.partialUpdate(expenseId, updates);

      if (!updated) {
        return next(new AppError(`Expense with ID ${expenseId} not found`, 404));
      }

      return res.status(200).json({
        success: true,
        message: 'Expense partially updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/v1/expenses/:id
   */
  async deleteExpense(req, res, next) {
    try {
      const expenseId = req.params.id;
      const deleted = await Expense.delete(expenseId);

      if (!deleted) {
        return next(new AppError(`Expense with ID ${expenseId} not found`, 404));
      }

      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};

module.exports = expenseController;
