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

// Start listening if executed directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
