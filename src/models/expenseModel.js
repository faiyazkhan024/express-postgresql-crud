const db = require('../config/db');

const Expense = {
  /**
   * Insert a new expense record
   */
  async create({ title, amount, category, expense_date, payment_method, status, notes }) {
    const query = `
      INSERT INTO expenses (title, amount, category, expense_date, payment_method, status, notes)
      VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), COALESCE($5, 'corporate_card'), COALESCE($6, 'pending'), $7)
      RETURNING *;
    `;
    const values = [
      title.trim(),
      amount,
      category.toLowerCase().trim(),
      expense_date || null,
      payment_method ? payment_method.toLowerCase().trim() : null,
      status ? status.toLowerCase().trim() : null,
      notes ? notes.trim() : null,
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  },

  /**
   * Find all expenses matching filter criteria with pagination and sorting
   */
  async findAll({ category, status, page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'DESC' }) {
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

    // Count total rows matching filters
    const countQuery = `SELECT COUNT(*) FROM expenses ${whereClause};`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Fetch paginated slice
    const offset = (page - 1) * limit;
    const dataValues = [...values, limit, offset];
    const dataQuery = `
      SELECT * FROM expenses
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length};
    `;
    const dataResult = await db.query(dataQuery, dataValues);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: dataResult.rows,
    };
  },

  /**
   * Find an expense by primary key ID
   */
  async findById(id) {
    const query = 'SELECT * FROM expenses WHERE id = $1;';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  },

  /**
   * Fully update an expense record
   */
  async update(id, { title, amount, category, expense_date, payment_method, status, notes }) {
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
      amount,
      category.toLowerCase().trim(),
      expense_date || null,
      payment_method ? payment_method.toLowerCase().trim() : null,
      status ? status.toLowerCase().trim() : null,
      notes !== undefined ? (notes ? notes.trim() : null) : null,
      id,
    ];
    const result = await db.query(query, values);
    return result.rows[0] || null;
  },

  /**
   * Partially update specified fields of an expense record
   */
  async partialUpdate(id, updates) {
    const allowedFields = ['title', 'amount', 'category', 'expense_date', 'payment_method', 'status', 'notes'];
    const fields = Object.keys(updates).filter(field => allowedFields.includes(field));

    if (fields.length === 0) {
      return null;
    }

    const setClauses = [];
    const values = [];

    fields.forEach((field) => {
      let val = updates[field];
      if (typeof val === 'string') {
        val = val.trim();
        if (['category', 'payment_method', 'status'].includes(field)) {
          val = val.toLowerCase();
        }
      }
      values.push(val);
      setClauses.push(`${field} = $${values.length}`);
    });

    values.push(id);
    const query = `
      UPDATE expenses
      SET ${setClauses.join(', ')}
      WHERE id = $${values.length}
      RETURNING *;
    `;

    const result = await db.query(query, values);
    return result.rows[0] || null;
  },

  /**
   * Delete an expense by ID
   */
  async delete(id) {
    const query = 'DELETE FROM expenses WHERE id = $1 RETURNING id;';
    const result = await db.query(query, [id]);
    return result.rows.length > 0;
  },

  /**
   * Aggregation analytics: overall totals, category breakdown, status breakdown
   */
  async getSummary() {
    const totalsQuery = `
      SELECT
        COUNT(*)::int AS total_count,
        COALESCE(SUM(amount), 0)::numeric(12, 2) AS total_amount,
        COALESCE(AVG(amount), 0)::numeric(10, 2) AS average_amount
      FROM expenses;
    `;
    const byCategoryQuery = `
      SELECT
        category,
        COUNT(*)::int AS count,
        SUM(amount)::numeric(12, 2) AS total_amount
      FROM expenses
      GROUP BY category
      ORDER BY total_amount DESC;
    `;
    const byStatusQuery = `
      SELECT
        status,
        COUNT(*)::int AS count,
        SUM(amount)::numeric(12, 2) AS total_amount
      FROM expenses
      GROUP BY status
      ORDER BY count DESC;
    `;

    const [totals, byCategory, byStatus] = await Promise.all([
      db.query(totalsQuery),
      db.query(byCategoryQuery),
      db.query(byStatusQuery),
    ]);

    return {
      overview: totals.rows[0],
      byCategory: byCategory.rows,
      byStatus: byStatus.rows,
    };
  },
};

module.exports = Expense;
