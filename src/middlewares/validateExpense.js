const AppError = require('../errors/AppError');

const ALLOWED_CATEGORIES = ['travel', 'meals', 'software', 'hardware', 'office', 'training', 'other'];
const ALLOWED_PAYMENT_METHODS = ['corporate_card', 'personal_card', 'cash', 'bank_transfer'];
const ALLOWED_STATUSES = ['pending', 'approved', 'rejected', 'reimbursed'];
const ALLOWED_SORT_COLUMNS = ['id', 'amount', 'expense_date', 'created_at', 'title'];

/**
 * Validate that :id is a positive integer
 */
const validateIdParam = (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0 || `${id}` !== `${req.params.id}`.trim()) {
    return next(new AppError('Invalid expense ID. ID must be a positive integer.', 400));
  }
  req.params.id = id;
  next();
};

/**
 * Helper to validate expense fields
 */
const validateExpenseFields = (body, isPartial = false) => {
  const errors = [];
  const { title, amount, category, expense_date, payment_method, status, notes } = body;

  // Title validation
  if (!isPartial || title !== undefined) {
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      errors.push({ field: 'title', message: 'Title is required and must be a non-empty string.' });
    } else if (title.trim().length > 150) {
      errors.push({ field: 'title', message: 'Title cannot exceed 150 characters.' });
    }
  }

  // Amount validation
  if (!isPartial || amount !== undefined) {
    const parsedAmount = parseFloat(amount);
    if (amount === undefined || amount === null || isNaN(parsedAmount) || parsedAmount <= 0) {
      errors.push({ field: 'amount', message: 'Amount is required and must be a positive number.' });
    }
  }

  // Category validation
  if (!isPartial || category !== undefined) {
    if (!category || typeof category !== 'string' || !ALLOWED_CATEGORIES.includes(category.toLowerCase().trim())) {
      errors.push({
        field: 'category',
        message: `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}.`,
      });
    }
  }

  // Expense Date validation
  if (expense_date !== undefined && expense_date !== null && expense_date !== '') {
    const parsedDate = Date.parse(expense_date);
    if (isNaN(parsedDate)) {
      errors.push({ field: 'expense_date', message: 'Expense date must be a valid ISO date string (YYYY-MM-DD).' });
    }
  }

  // Payment Method validation
  if (payment_method !== undefined && payment_method !== null) {
    if (typeof payment_method !== 'string' || !ALLOWED_PAYMENT_METHODS.includes(payment_method.toLowerCase().trim())) {
      errors.push({
        field: 'payment_method',
        message: `Payment method must be one of: ${ALLOWED_PAYMENT_METHODS.join(', ')}.`,
      });
    }
  }

  // Status validation
  if (status !== undefined && status !== null) {
    if (typeof status !== 'string' || !ALLOWED_STATUSES.includes(status.toLowerCase().trim())) {
      errors.push({
        field: 'status',
        message: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}.`,
      });
    }
  }

  // Notes validation
  if (notes !== undefined && notes !== null && typeof notes !== 'string') {
    errors.push({ field: 'notes', message: 'Notes must be a string.' });
  }

  return errors;
};

/**
 * Validate payload for POST /expenses
 */
const validateCreateExpense = (req, res, next) => {
  const errors = validateExpenseFields(req.body, false);
  if (errors.length > 0) {
    return next(new AppError('Expense validation failed', 400, errors));
  }
  next();
};

/**
 * Validate payload for PUT /expenses/:id
 */
const validateUpdateExpense = (req, res, next) => {
  const errors = validateExpenseFields(req.body, false);
  if (errors.length > 0) {
    return next(new AppError('Expense update validation failed', 400, errors));
  }
  next();
};

/**
 * Validate payload for PATCH /expenses/:id
 */
const validatePartialUpdateExpense = (req, res, next) => {
  const allowedFields = ['title', 'amount', 'category', 'expense_date', 'payment_method', 'status', 'notes'];
  const providedFields = Object.keys(req.body).filter(k => allowedFields.includes(k));

  if (providedFields.length === 0) {
    return next(new AppError('At least one valid field must be provided for partial update.', 400));
  }

  const errors = validateExpenseFields(req.body, true);
  if (errors.length > 0) {
    return next(new AppError('Expense partial update validation failed', 400, errors));
  }
  next();
};

/**
 * Validate query parameters for GET /expenses
 */
const validateQueryParams = (req, res, next) => {
  const errors = [];
  const { page, limit, category, status, sortBy, sortOrder } = req.query;

  if (page !== undefined) {
    const p = parseInt(page, 10);
    if (isNaN(p) || p < 1) {
      errors.push({ field: 'page', message: 'Page must be an integer >= 1.' });
    }
  }

  if (limit !== undefined) {
    const l = parseInt(limit, 10);
    if (isNaN(l) || l < 1 || l > 100) {
      errors.push({ field: 'limit', message: 'Limit must be an integer between 1 and 100.' });
    }
  }

  if (category && !ALLOWED_CATEGORIES.includes(category.toLowerCase().trim())) {
    errors.push({ field: 'category', message: `Category filter must be one of: ${ALLOWED_CATEGORIES.join(', ')}.` });
  }

  if (status && !ALLOWED_STATUSES.includes(status.toLowerCase().trim())) {
    errors.push({ field: 'status', message: `Status filter must be one of: ${ALLOWED_STATUSES.join(', ')}.` });
  }

  if (sortBy && !ALLOWED_SORT_COLUMNS.includes(sortBy)) {
    errors.push({ field: 'sortBy', message: `SortBy must be one of: ${ALLOWED_SORT_COLUMNS.join(', ')}.` });
  }

  if (sortOrder && !['asc', 'desc'].includes(sortOrder.toLowerCase())) {
    errors.push({ field: 'sortOrder', message: 'SortOrder must be either "asc" or "desc".' });
  }

  if (errors.length > 0) {
    return next(new AppError('Invalid query parameters', 400, errors));
  }
  next();
};

module.exports = {
  validateIdParam,
  validateCreateExpense,
  validateUpdateExpense,
  validatePartialUpdateExpense,
  validateQueryParams,
  ALLOWED_CATEGORIES,
  ALLOWED_PAYMENT_METHODS,
  ALLOWED_STATUSES,
};
