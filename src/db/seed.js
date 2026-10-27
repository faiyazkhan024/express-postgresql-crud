const { pool } = require('../config/db');

const seedExpenses = [
  {
    title: 'AWS Cloud Infrastructure - October',
    amount: 189.50,
    category: 'software',
    expense_date: '2026-10-05',
    payment_method: 'corporate_card',
    status: 'reimbursed',
    notes: 'Monthly production container cluster and RDS database',
  },
  {
    title: 'GitHub Enterprise Team Plan',
    amount: 210.00,
    category: 'software',
    expense_date: '2026-10-10',
    payment_method: 'corporate_card',
    status: 'approved',
    notes: 'Annual developer seat renewal and Copilot licenses',
  },
  {
    title: 'Standing Desk Converters (x2)',
    amount: 450.00,
    category: 'hardware',
    expense_date: '2026-10-12',
    payment_method: 'bank_transfer',
    status: 'approved',
    notes: 'Ergonomic equipment for frontend engineering team',
  },
  {
    title: 'Client Lunch - Acme Corp Renewal',
    amount: 132.80,
    category: 'meals',
    expense_date: '2026-10-15',
    payment_method: 'personal_card',
    status: 'pending',
    notes: 'Q4 contract renewal and SLA review meeting',
  },
  {
    title: 'Flight to TechCon 2026 - Chicago',
    amount: 425.60,
    category: 'travel',
    expense_date: '2026-10-18',
    payment_method: 'corporate_card',
    status: 'approved',
    notes: 'Round-trip airfare for keynote speaker',
  },
  {
    title: 'Hotel Stay - TechCon (3 Nights)',
    amount: 580.00,
    category: 'travel',
    expense_date: '2026-10-21',
    payment_method: 'corporate_card',
    status: 'pending',
    notes: 'Conference partner venue accommodation',
  },
  {
    title: 'Ergonomic Keyboard (Kinesis Advantage)',
    amount: 349.00,
    category: 'hardware',
    expense_date: '2026-10-22',
    payment_method: 'personal_card',
    status: 'reimbursed',
    notes: 'Approved medical workplace accommodation equipment',
  },
  {
    title: 'Office Coffee Beans & Supplies',
    amount: 88.40,
    category: 'office',
    expense_date: '2026-10-23',
    payment_method: 'cash',
    status: 'reimbursed',
    notes: 'Monthly pantry restocking from local roastery',
  },
  {
    title: 'Docker Desktop Team Subscriptions',
    amount: 60.00,
    category: 'software',
    expense_date: '2026-10-24',
    payment_method: 'corporate_card',
    status: 'approved',
    notes: 'Monthly dev workstations container tool licenses',
  },
  {
    title: 'PostgreSQL Performance Tuning Seminar',
    amount: 299.00,
    category: 'training',
    expense_date: '2026-10-25',
    payment_method: 'personal_card',
    status: 'pending',
    notes: 'Advanced query planner and indexing workshop',
  },
  {
    title: 'Team Quarterly Milestone Dinner',
    amount: 315.25,
    category: 'meals',
    expense_date: '2026-10-26',
    payment_method: 'corporate_card',
    status: 'approved',
    notes: 'Celebration of v2.0 REST API launch',
  },
  {
    title: 'Ultrawide Monitors 4K (x2)',
    amount: 750.00,
    category: 'hardware',
    expense_date: '2026-10-26',
    payment_method: 'bank_transfer',
    status: 'rejected',
    notes: 'Exceeded per-quarter hardware budget ceiling; resubmit in Q1',
  },
];

async function seedDatabase() {
  const client = await pool.connect();
  try {
    console.log('Seeding ExpenseFlow database...');

    await client.query('BEGIN');

    // Reset table and identity
    await client.query('TRUNCATE TABLE expenses RESTART IDENTITY CASCADE;');

    const insertQuery = `
      INSERT INTO expenses (title, amount, category, expense_date, payment_method, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, title, amount, category, status;
    `;

    for (const exp of seedExpenses) {
      await client.query(insertQuery, [
        exp.title,
        exp.amount,
        exp.category,
        exp.expense_date,
        exp.payment_method,
        exp.status,
        exp.notes,
      ]);
    }

    await client.query('COMMIT');
    console.log(`Successfully seeded ${seedExpenses.length} expense records into PostgreSQL.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database seeding failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
