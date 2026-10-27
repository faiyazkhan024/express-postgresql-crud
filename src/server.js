require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Database-backed health check route
app.get('/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() as db_time, current_database() as db_name;');
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: 'connected',
        database: result.rows[0].db_name,
        serverTime: result.rows[0].db_time
      }
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed',
      error: err.message
    });
  }
});

// Root welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to ExpenseFlow API',
    docs: '/api/v1/expenses',
    health: '/health'
  });
});

// POST /api/v1/expenses - Create new expense
app.post('/api/v1/expenses', async (req, res) => {
  const { title, amount, category, expense_date, payment_method, status, notes } = req.body;

  // Basic validation
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Title is required and must be a non-empty string'
    });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Amount is required and must be a positive number'
    });
  }

  if (!category || typeof category !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Category is required'
    });
  }

  try {
    const query = `
      INSERT INTO expenses (title, amount, category, expense_date, payment_method, status, notes)
      VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), COALESCE($5, 'corporate_card'), COALESCE($6, 'pending'), $7)
      RETURNING *;
    `;
    const values = [
      title.trim(),
      parsedAmount,
      category.toLowerCase().trim(),
      expense_date || null,
      payment_method ? payment_method.toLowerCase().trim() : null,
      status ? status.toLowerCase().trim() : null,
      notes ? notes.trim() : null
    ];

    const result = await db.query(query, values);
    return res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating expense:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while creating expense',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET /api/v1/expenses - Retrieve all expenses with filtering and pagination
app.get('/api/v1/expenses', async (req, res) => {
  try {
    const { category, status, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    // Allowed sort columns to prevent SQL injection in ORDER BY
    const allowedSortColumns = ['id', 'amount', 'expense_date', 'created_at', 'title'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const conditions = [];
    const values = [];

    if (category) {
      values.push(category.toLowerCase().trim());
      conditions.push(`category = $${values.length}`);
    }

    if (status) {
      values.push(status.toLowerCase().trim());
      conditions.push(`status = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query for pagination
    const countQuery = `SELECT COUNT(*) FROM expenses ${whereClause};`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query
    const dataValues = [...values, limit, offset];
    const dataQuery = `
      SELECT * FROM expenses
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length};
    `;
    const dataResult = await db.query(dataQuery, dataValues);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: dataResult.rows
    });
  } catch (err) {
    console.error('Error fetching expenses:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while fetching expenses',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET /api/v1/expenses/:id - Retrieve single expense by ID
app.get('/api/v1/expenses/:id', async (req, res) => {
  const expenseId = parseInt(req.params.id, 10);
  if (isNaN(expenseId) || expenseId <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid expense ID. ID must be a positive integer.'
    });
  }

  try {
    const query = 'SELECT * FROM expenses WHERE id = $1;';
    const result = await db.query(query, [expenseId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Expense with ID ${expenseId} not found`
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error fetching expense by ID:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while fetching expense',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// PUT /api/v1/expenses/:id - Full update of an expense
app.put('/api/v1/expenses/:id', async (req, res) => {
  const expenseId = parseInt(req.params.id, 10);
  if (isNaN(expenseId) || expenseId <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid expense ID. ID must be a positive integer.'
    });
  }

  const { title, amount, category, expense_date, payment_method, status, notes } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Title is required and must be a non-empty string'
    });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Amount is required and must be a positive number'
    });
  }

  if (!category || typeof category !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Category is required'
    });
  }

  try {
    const query = `
      UPDATE expenses
      SET title = $1,
          amount = $2,
          category = $3,
          expense_date = COALESCE($4, expense_date),
          payment_method = COALESCE($5, payment_method),
          status = COALESCE($6, status),
          notes = $7
      WHERE id = $8
      RETURNING *;
    `;
    const values = [
      title.trim(),
      parsedAmount,
      category.toLowerCase().trim(),
      expense_date || null,
      payment_method ? payment_method.toLowerCase().trim() : null,
      status ? status.toLowerCase().trim() : null,
      notes !== undefined ? (notes ? notes.trim() : null) : null,
      expenseId
    ];

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Expense with ID ${expenseId} not found`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating expense with PUT:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while updating expense',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// PATCH /api/v1/expenses/:id - Partial update of an expense
app.patch('/api/v1/expenses/:id', async (req, res) => {
  const expenseId = parseInt(req.params.id, 10);
  if (isNaN(expenseId) || expenseId <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid expense ID. ID must be a positive integer.'
    });
  }

  const allowedFields = ['title', 'amount', 'category', 'expense_date', 'payment_method', 'status', 'notes'];
  const fields = Object.keys(req.body).filter(field => allowedFields.includes(field));

  if (fields.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'At least one valid field must be provided for update'
    });
  }

  // Validate specific fields if provided
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
  }

  try {
    const setClauses = [];
    const values = [];

    fields.forEach((field) => {
      let val = req.body[field];
      if (typeof val === 'string') {
        val = val.trim();
        if (['category', 'payment_method', 'status'].includes(field)) {
          val = val.toLowerCase();
        }
      }
      values.push(val);
      setClauses.push(`${field} = $${values.length}`);
    });

    values.push(expenseId);
    const query = `
      UPDATE expenses
      SET ${setClauses.join(', ')}
      WHERE id = $${values.length}
      RETURNING *;
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Expense with ID ${expenseId} not found`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Expense partially updated successfully',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating expense with PATCH:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while updating expense',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// DELETE /api/v1/expenses/:id - Delete an expense
app.delete('/api/v1/expenses/:id', async (req, res) => {
  const expenseId = parseInt(req.params.id, 10);
  if (isNaN(expenseId) || expenseId <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid expense ID. ID must be a positive integer.'
    });
  }

  try {
    const query = 'DELETE FROM expenses WHERE id = $1 RETURNING id;';
    const result = await db.query(query, [expenseId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Expense with ID ${expenseId} not found`
      });
    }

    // 204 No Content for successful deletion
    return res.status(204).send();
  } catch (err) {
    console.error('Error deleting expense:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while deleting expense',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Start listening if executed directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
