const AppError = require('../errors/AppError');

/**
 * 404 handler for unmatched routes
 */
const notFoundHandler = (req, res, next) => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl} - Endpoint not found`, 404));
};

/**
 * Global centralized error handler
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // Handle specific PostgreSQL error codes
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        statusCode = 409;
        message = 'A record with this unique identifier already exists.';
        break;
      case '23514': // check_violation
        statusCode = 400;
        message = 'Database check constraint violation.';
        break;
      case '23502': // not_null_violation
        statusCode = 400;
        message = `Missing required column: ${err.column || 'field'}.`;
        break;
      case '22P02': // invalid_text_representation (e.g. bad integer)
        statusCode = 400;
        message = 'Invalid data representation provided.';
        break;
      default:
        if (statusCode === 500) {
          console.error('Unhandled Database Error Code:', err.code, err.message);
        }
    }
  }

  // In production, do not leak internal system details for 500 errors
  const isDev = process.env.NODE_ENV === 'development';
  if (statusCode === 500 && !isDev) {
    message = 'An unexpected error occurred. Please try again later.';
  }

  res.status(statusCode).json({
    success: false,
    status: `${statusCode}`.startsWith('4') ? 'fail' : 'error',
    message,
    ...(errors && { errors }),
    ...(isDev && { stack: err.stack }),
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
