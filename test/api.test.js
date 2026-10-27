const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');
const { pool } = require('../src/config/db');

let server;
let baseUrl;

test.before(async () => {
  // Start server on an OS-assigned ephemeral port
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('GET /health returns 200 and confirms database connectivity', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.equal(data.database.status, 'connected');
});

test('GET / returns 200 with API welcome payload', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.message, 'Welcome to ExpenseFlow API');
  assert.ok(data.endpoints.expenses);
});

test('POST /api/v1/expenses validates missing or invalid fields (400 Bad Request)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '',
      amount: -100,
      category: 'invalid_category',
    }),
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.equal(data.status, 'fail');
  assert.ok(Array.isArray(data.errors));
  assert.ok(data.errors.length >= 3);
});

let createdExpenseId;

test('POST /api/v1/expenses creates a new expense (201 Created)', async () => {
  const payload = {
    title: 'Automated Test Cloud Worker',
    amount: 79.99,
    category: 'software',
    payment_method: 'corporate_card',
    status: 'pending',
    notes: 'Integration test expense',
  };

  const res = await fetch(`${baseUrl}/api/v1/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.data.title, payload.title);
  assert.equal(data.data.amount, '79.99');
  assert.equal(data.data.category, 'software');
  assert.ok(data.data.id > 0);
  createdExpenseId = data.data.id;
});

test('GET /api/v1/expenses lists paginated expenses with filters (200 OK)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/expenses?category=software&limit=5`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.pagination);
  assert.ok(Array.isArray(data.data));
  assert.ok(data.data.length > 0);
  for (const item of data.data) {
    assert.equal(item.category, 'software');
  }
});

test('GET /api/v1/expenses/summary returns financial aggregation analytics (200 OK)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/expenses/summary`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.data.overview.total_count > 0);
  assert.ok(Array.isArray(data.data.byCategory));
  assert.ok(Array.isArray(data.data.byStatus));
});

test('GET /api/v1/expenses/:id retrieves the created expense (200 OK)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/expenses/${createdExpenseId}`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.data.id, createdExpenseId);
});

test('PUT /api/v1/expenses/:id updates all fields (200 OK)', async () => {
  const updatedPayload = {
    title: 'Automated Test Cloud Worker - Updated',
    amount: 89.99,
    category: 'software',
    payment_method: 'corporate_card',
    status: 'approved',
    notes: 'Upgraded worker specs',
  };

  const res = await fetch(`${baseUrl}/api/v1/expenses/${createdExpenseId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedPayload),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.data.title, updatedPayload.title);
  assert.equal(data.data.amount, '89.99');
  assert.equal(data.data.status, 'approved');
});

test('PATCH /api/v1/expenses/:id partially updates an expense (200 OK)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/expenses/${createdExpenseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'reimbursed' }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.data.status, 'reimbursed');
});

test('DELETE /api/v1/expenses/:id deletes the expense (204 No Content)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/expenses/${createdExpenseId}`, {
    method: 'DELETE',
  });
  assert.equal(res.status, 204);

  // Subsequent GET should return 404
  const verifyRes = await fetch(`${baseUrl}/api/v1/expenses/${createdExpenseId}`);
  assert.equal(verifyRes.status, 404);
});

test('404 for unmapped endpoint', async () => {
  const res = await fetch(`${baseUrl}/api/v1/unknown-resource-path`);
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.status, 'fail');
});
