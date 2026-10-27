# ExpenseFlow API

> A robust, portfolio-ready CRUD REST API built with Node.js, Express.js, and PostgreSQL for corporate and team expense management.

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-4.x-black.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

---

## Overview & Domain Rationale

Tracking organizational and project expenditures is a foundational backend necessity across technology teams. **ExpenseFlow** is designed around real-world business constraints:
- **Financial Precision:** Strict monetary decimal precision using PostgreSQL `NUMERIC(10, 2)` prevents floating-point inaccuracies.
- **Categorical & Workflow Integrity:** Constrained domain enums (`travel`, `meals`, `software`, `hardware`, `office`, `training`, `other`) and status lifecycles (`pending` → `approved` → `reimbursed` / `rejected`).
- **Analytics & Reporting:** Aggregated SQL analytics (`/api/v1/expenses/summary`) providing category-level and status-level expenditure breakdowns alongside global volume and averages.
- **Defensive Engineering:** 100% parameterized SQL queries to eliminate SQL injection vulnerabilities, coupled with schema-level check constraints and automated timestamp triggers.

---

## Architectural Highlights

- **Layered MVC Architecture:** Clean separation of concerns between HTTP routing (`routes/`), request orchestration (`controllers/`), raw SQL data access (`models/`), and cross-cutting concerns (`middlewares/`, `errors/`).
- **Connection Pooling:** Built on `pg.Pool` with connection reuse, idle client error recovery, and graceful process shutdown listeners (`SIGTERM`/`SIGINT`).
- **Input Validation Middleware:** Centralized request validation intercepting malformed payloads, non-numeric amounts, invalid ISO dates, and unapproved enum values before reaching database layers.
- **Centralized Error Handling:** Custom `AppError` operational error abstraction, Postgres error code translation (e.g. `23505`, `23514`, `23502`), and production error stack sanitization.
- **Database Automations:** Automatic `updated_at` column updates handled entirely inside PostgreSQL via procedural triggers.
- **CLI Migrations & Seeding:** Transactional scripts to run schema migrations and populate sample business data.

---

## Project Structure

```text
express-postgresql-crud/
├── src/
│   ├── config/
│   │   └── db.js                 # PostgreSQL connection pool and query interface
│   ├── controllers/
│   │   └── expenseController.js  # HTTP request handling and status responses
│   ├── db/
│   │   ├── migrate.js            # Transactional migration runner
│   │   ├── schema.sql            # DDL: tables, indexes, constraints, triggers
│   │   └── seed.js               # Sample dataset seeding script
│   ├── errors/
│   │   └── AppError.js           # Custom operational error class
│   ├── middlewares/
│   │   ├── errorHandler.js       # Centralized 404 and global error handler
│   │   └── validateExpense.js    # Payload and query parameter validation
│   ├── models/
│   │   └── expenseModel.js       # Parameterized SQL queries and aggregates
│   ├── routes/
│   │   └── expenseRoutes.js      # RESTful resource routing
│   ├── app.js                    # Express application configuration
│   └── server.js                 # Server entrypoint and graceful shutdown
├── .env.example                  # Environment configuration template
├── .gitignore                    # Git ignore rules (secrets, node_modules, logs)
├── package.json                  # Scripts and dependencies
└── README.md                     # Documentation
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.x (tested on v20.x)
- **PostgreSQL** >= 14.x
- **npm** >= 9.x

### 1. Clone the Repository

```bash
git clone git@github.com:faiyazkhan024/express-postgresql-crud.git
cd express-postgresql-crud
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file and adjust the database credentials to match your PostgreSQL setup:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=express_crud_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password

DB_MAX_CONNECTIONS=10
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=2000
```

### 4. Create the Database

Using `psql` or your database administration client:

```sql
CREATE DATABASE express_crud_db;
```

### 5. Run Database Migrations

Apply the schema (tables, indexes, check constraints, and trigger functions):

```bash
npm run migrate
```

### 6. (Optional) Seed the Database

Populate 12 realistic business expense records:

```bash
npm run seed
```

### 7. Start the Server

**Development Mode (auto-reloading with nodemon):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

---

## Environment Variables

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Integer | `3000` | Port for Express HTTP server |
| `NODE_ENV` | String | `development` | Runtime environment (`development` / `production`) |
| `DB_HOST` | String | `localhost` | PostgreSQL host |
| `DB_PORT` | Integer | `5432` | PostgreSQL port |
| `DB_NAME` | String | `express_crud_db` | PostgreSQL database name |
| `DB_USER` | String | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | String | `postgres` | PostgreSQL password |
| `DB_MAX_CONNECTIONS` | Integer | `10` | Max clients in the connection pool |
| `DB_IDLE_TIMEOUT_MS` | Integer | `30000` | Idle client cleanup timeout (ms) |
| `DB_CONNECTION_TIMEOUT_MS` | Integer | `2000` | Connection acquisition timeout (ms) |

---

## Database Schema (`expenses`)

| Column | Type | Constraints / Defaults | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Auto-incrementing identifier |
| `title` | `VARCHAR(150)` | `NOT NULL` | Description of expenditure |
| `amount` | `NUMERIC(10, 2)` | `NOT NULL, CHECK (amount > 0)` | Expense amount in standard currency |
| `category` | `VARCHAR(50)` | `NOT NULL, CHECK IN (...)` | Enum: `travel`, `meals`, `software`, `hardware`, `office`, `training`, `other` |
| `expense_date` | `DATE` | `NOT NULL, DEFAULT CURRENT_DATE` | Date expense occurred |
| `payment_method` | `VARCHAR(50)` | `DEFAULT 'corporate_card', CHECK IN (...)` | Enum: `corporate_card`, `personal_card`, `cash`, `bank_transfer` |
| `status` | `VARCHAR(30)` | `DEFAULT 'pending', CHECK IN (...)` | Enum: `pending`, `approved`, `rejected`, `reimbursed` |
| `notes` | `TEXT` | `NULL` | Optional context or justification |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Automated update trigger timestamp |

**Indexes:**
- `idx_expenses_category` on `category`
- `idx_expenses_status` on `status`
- `idx_expenses_expense_date` on `expense_date`
- `idx_expenses_created_at` on `created_at DESC`

---

## API Endpoints Reference

| Method | Endpoint | Description | Expected Status Codes |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Live service & database health check | `200`, `503` |
| `GET` | `/` | API entrypoint and directory links | `200` |
| `GET` | `/api/v1/expenses` | List expenses (filtering, pagination, sorting) | `200`, `400`, `500` |
| `GET` | `/api/v1/expenses/summary` | Aggregate financial metrics and breakdowns | `200`, `500` |
| `GET` | `/api/v1/expenses/:id` | Get single expense by ID | `200`, `400`, `404`, `500` |
| `POST` | `/api/v1/expenses` | Create a new expense | `201`, `400`, `500` |
| `PUT` | `/api/v1/expenses/:id` | Full replacement of an existing expense | `200`, `400`, `404`, `500` |
| `PATCH` | `/api/v1/expenses/:id` | Partial update of an existing expense | `200`, `400`, `404`, `500` |
| `DELETE` | `/api/v1/expenses/:id` | Remove an expense | `204`, `400`, `404`, `500` |

---

## Example Requests & Responses

### 1. Health Check
```bash
curl -X GET http://localhost:3000/health
```
```json
{
  "status": "ok",
  "timestamp": "2026-10-27T08:53:02.107Z",
  "uptime": 14.52,
  "database": {
    "status": "connected",
    "database": "express_crud_db",
    "serverTime": "2026-10-27T08:53:02.105Z"
  }
}
```

### 2. Create an Expense
```bash
curl -X POST http://localhost:3000/api/v1/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "title": "JetBrains All Products Pack",
    "amount": 289.00,
    "category": "software",
    "payment_method": "corporate_card",
    "notes": "IDE licenses for backend developers"
  }'
```
```json
{
  "success": true,
  "message": "Expense created successfully",
  "data": {
    "id": 13,
    "title": "JetBrains All Products Pack",
    "amount": "289.00",
    "category": "software",
    "expense_date": "2026-10-27T00:00:00.000Z",
    "payment_method": "corporate_card",
    "status": "pending",
    "notes": "IDE licenses for backend developers",
    "created_at": "2026-10-27T09:00:00.000Z",
    "updated_at": "2026-10-27T09:00:00.000Z"
  }
}
```

### 3. List Expenses with Pagination and Filter
```bash
curl -X GET "http://localhost:3000/api/v1/expenses?category=software&page=1&limit=2&sortBy=amount&sortOrder=DESC"
```
```json
{
  "success": true,
  "pagination": {
    "total": 4,
    "page": 1,
    "limit": 2,
    "totalPages": 2
  },
  "data": [
    {
      "id": 13,
      "title": "JetBrains All Products Pack",
      "amount": "289.00",
      "category": "software",
      "expense_date": "2026-10-27T00:00:00.000Z",
      "payment_method": "corporate_card",
      "status": "pending",
      "notes": "IDE licenses for backend developers",
      "created_at": "2026-10-27T09:00:00.000Z",
      "updated_at": "2026-10-27T09:00:00.000Z"
    },
    {
      "id": 2,
      "title": "GitHub Enterprise Team Plan",
      "amount": "210.00",
      "category": "software",
      "expense_date": "2026-10-10T00:00:00.000Z",
      "payment_method": "corporate_card",
      "status": "approved",
      "notes": "Annual developer seat renewal and Copilot licenses",
      "created_at": "2026-10-27T08:59:52.003Z",
      "updated_at": "2026-10-27T08:59:52.003Z"
    }
  ]
}
```

### 4. Financial Analytics Summary
```bash
curl -X GET http://localhost:3000/api/v1/expenses/summary
```
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_count": 13,
      "total_amount": "4138.55",
      "average_amount": "318.35"
    },
    "byCategory": [
      { "category": "hardware", "count": 3, "total_amount": "1549.00" },
      { "category": "travel", "count": 2, "total_amount": "1005.60" },
      { "category": "software", "count": 4, "total_amount": "748.50" },
      { "category": "meals", "count": 2, "total_amount": "448.05" },
      { "category": "training", "count": 1, "total_amount": "299.00" },
      { "category": "office", "count": 1, "total_amount": "88.40" }
    ],
    "byStatus": [
      { "status": "approved", "count": 5, "total_amount": "1460.85" },
      { "status": "pending", "count": 4, "total_amount": "1300.80" },
      { "status": "reimbursed", "count": 3, "total_amount": "626.90" },
      { "status": "rejected", "count": 1, "total_amount": "750.00" }
    ]
  }
}
```

### 5. Partial Update (PATCH Status Transition)
```bash
curl -X PATCH http://localhost:3000/api/v1/expenses/13 \
  -H "Content-Type: application/json" \
  -d '{"status": "approved", "notes": "Approved by VP Engineering"}'
```
```json
{
  "success": true,
  "message": "Expense partially updated successfully",
  "data": {
    "id": 13,
    "title": "JetBrains All Products Pack",
    "amount": "289.00",
    "category": "software",
    "expense_date": "2026-10-27T00:00:00.000Z",
    "payment_method": "corporate_card",
    "status": "approved",
    "notes": "Approved by VP Engineering",
    "created_at": "2026-10-27T09:00:00.000Z",
    "updated_at": "2026-10-27T09:05:12.345Z"
  }
}
```

### 6. Delete an Expense
```bash
curl -i -X DELETE http://localhost:3000/api/v1/expenses/13
```
```http
HTTP/1.1 204 No Content
```

### 7. Input Validation Error Handling (400 Bad Request)
```bash
curl -X POST http://localhost:3000/api/v1/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "title": "",
    "amount": -50,
    "category": "cryptocurrency"
  }'
```
```json
{
  "success": false,
  "status": "fail",
  "message": "Expense validation failed",
  "errors": [
    { "field": "title", "message": "Title is required and must be a non-empty string." },
    { "field": "amount", "message": "Amount is required and must be a positive number." },
    { "field": "category", "message": "Category must be one of: travel, meals, software, hardware, office, training, other." }
  ]
}
```

---

## License

This project is licensed under the [ISC License](LICENSE).
