const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./config/db');
const expenseRoutes = require('./routes/expenseRoutes');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Database-backed health check route
app.get('/health', async (req, res, next) => {
  try {
    const result = await db.query('SELECT NOW() as db_time, current_database() as db_name;');
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: 'connected',
        database: result.rows[0].db_name,
        serverTime: result.rows[0].db_time,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Root welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to ExpenseFlow API',
    endpoints: {
      expenses: '/api/v1/expenses',
      summary: '/api/v1/expenses/summary',
      health: '/health',
    },
  });
});

// Mount modular API routes
app.use('/api/v1/expenses', expenseRoutes);

// Catch 404 for unhandled routes
app.use(notFoundHandler);

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;
