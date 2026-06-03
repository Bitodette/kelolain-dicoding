# Kelola.in — POS & Business Management Dashboard

A full-stack Point of Sale (POS) and business management dashboard built for small-to-medium enterprises. Features product management, cashier transactions, financial tracking, AI-powered predictions, and OCR receipt scanning.

![Stack](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite%208%20%7C%20Tailwind-blue)
![Stack](https://img.shields.io/badge/Backend-Express%205%20%7C%20Prisma%206%20%7C%20PostgreSQL-green)
![Stack](https://img.shields.io/badge/Deploy-Vercel%20%7C%20Render%20%7C%20Supabase-black)

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
  - [4. Seed the Database (Optional)](#4-seed-the-database-optional)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Overview](#api-overview)
- [Features](#features)
- [Deployment](#deployment)
- [Default Credentials](#default-credentials)
- [Project Structure](#project-structure)

---

## Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| React 19 | UI library |
| Vite 8 | Build tool & dev server |
| Tailwind CSS 3.4 | Utility-first styling |
| React Router v7 | Client-side routing |
| Axios | HTTP client |
| Recharts 3 | Charts & analytics |
| GSAP 3 | Landing page animations |
| Heroicons v2 | Icon library |

### Backend

| Technology | Purpose |
|------------|---------|
| Node.js | JavaScript runtime |
| Express 5 | Web framework |
| Prisma 6 | ORM & migrations |
| PostgreSQL | Database (Supabase) |
| JWT | Authentication |
| bcryptjs | Password hashing |
| Sharp | Image processing |
| Multer | File uploads |
| Helmet | Security headers |
| express-rate-limit | Rate limiting |

### External Services

| Service | Purpose |
|---------|---------|
| Supabase | Managed PostgreSQL |
| Railway | AI model & OCR APIs |
| Vercel | Frontend hosting |
| Render | Backend hosting |

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  React SPA  │───▶│ Express API │────▶│  PostgreSQL  │
│  (Vercel)   │     │  (Render)   │     │  (Supabase)  │
└─────────────┘     └──────┬──────┘     └──────────────┘
                           │
                    ┌──────┴──────┐
                    │  AI/ML API  │
                    │  (Railway)  │
                    └─────────────┘
```

---

## Prerequisites

- **Node.js** 18.x or later
- **npm** 9.x or later
- **PostgreSQL** 14+ (local or remote — Supabase recommended)
- A code editor (VS Code recommended)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Bitodette/kelolain-dicoding.git
cd kelolain-dicoding
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory (see [Environment Variables](#environment-variables) below).

Run the Prisma migration to set up the database schema:

```bash
npx prisma migrate dev --name init
```

Generate the Prisma client:

```bash
npx prisma generate
```

Start the development server:

```bash
npm run dev
```

The API will be available at `http://localhost:5000`.

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_BASE=http://localhost:5000
```

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### 4. Seed the Database (Optional)

Populate the database with a test user and 18 months of realistic transaction data:

```bash
cd backend
npm run seed
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string (Prisma) | Yes |
| `DIRECT_URL` | Direct PostgreSQL connection string (for migrations) | Yes |
| `PORT` | Server port (default: `5000`) | No |
| `JWT_SECRET` | Secret key for signing JWT tokens | Yes |
| `AI_BASE_URL` | AI prediction model API base URL | Yes |
| `RECEIPT_SCANNER_URL` | OCR receipt scanner API base URL | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous API key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |

### Frontend (`frontend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_BASE` | Backend API base URL | Yes |

---

## Available Scripts

### Backend

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot-reload (nodemon) |
| `npm start` | Start production server |
| `npm run seed` | Seed database with sample data |

### Frontend

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## API Overview

All API routes are prefixed with `/api`. Most endpoints require a Bearer JWT token in the `Authorization` header.

| Category | Endpoints |
|----------|-----------|
| **Auth** | `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, `PUT /auth/profile` |
| **Products** | `GET/POST /products`, `PUT/DELETE /products/:id`, `POST /products/:id/restock` |
| **Categories** | `GET/POST /categories`, `DELETE /categories/:id` |
| **Roles** | `GET/POST /roles`, `PUT/DELETE /roles/:id` |
| **Users** | `GET/POST /users`, `PUT/DELETE /users/:id` |
| **Transactions** | `GET/POST /transactions`, `GET/PUT/DELETE /transactions/:id` |
| **Finance** | `GET /finance/overview?period=week\|month\|year\|all\|custom` |
| **AI** | `GET /ai/revenue`, `GET /ai/demand`, `GET /ai/bundling`, `POST /ai/ocr/check-blur`, `POST /ai/ocr/scan` |
| **Notifications** | `GET /notifications`, `PATCH /notifications/read-all`, `PATCH /notifications/:id/read` |

**Rate Limits:**
- Global API: 200 requests per 15 minutes
- Auth endpoints: 20 requests per 15 minutes

---

## Features

- **POS Cashier** — Product grid, cart management, discount application, receipt scanning
- **Product Management** — CRUD operations, categories, batch/FIFO stock tracking, low-stock alerts
- **Financial Dashboard** — Revenue/expense overview, period filtering, trend charts, expense breakdown
- **Transaction History** — Paginated records with date range filtering
- **AI Insights** — Revenue prediction, demand forecasting, product bundling suggestions
- **OCR Receipt Scanner** — Upload receipt images, blur detection, automatic item extraction
- **Role-Based Access Control** — Page-level permissions with customizable roles
- **Multi-Organization** — Tenant-isolated data per organization
- **FIFO COGS** — Cost of goods sold computed using first-in-first-out batch tracking
- **Notifications** — Real-time low-stock alerts with read/unread tracking

---

## Deployment

### Frontend

The frontend is deployed on **Vercel**. The `vercel.json` file includes SPA rewrites for client-side routing:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Set `VITE_API_BASE` to the production backend URL in the Vercel environment variables.

### Backend

The backend is deployed on **Render**. Ensure all environment variables are configured in the Render dashboard.

### Database

Uses **Supabase** PostgreSQL. Configure `DATABASE_URL` and `DIRECT_URL` with your Supabase connection strings.

---

## Default Credentials

After running the seed script:

| Field | Value |
|-------|-------|
| Username | `test` |
| Password | `admin` |

---

## Project Structure

```
kelolain-dicoding/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database schema
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js              # Prisma client singleton
│   │   ├── controllers/           # Route handlers
│   │   ├── middlewares/           # Auth, error handling
│   │   ├── routes/
│   │   │   └── api.js             # All API route definitions
│   │   └── utils/                 # Date helpers, finance logic
│   ├── server.js                  # Express entry point
│   └── seed.js                    # Database seeder
├── frontend/
│   ├── public/
│   │   └── screenshots/           # Marketing screenshots
│   ├── src/
│   │   ├── components/            # Reusable UI components
│   │   ├── pages/                 # Page components
│   │   └── utils/                 # API client, auth helpers
│   ├── vercel.json                # Vercel deployment config
│   ├── vite.config.js             # Vite configuration
│   └── tailwind.config.js         # Tailwind configuration
├── .gitignore
└── README.md
```

---

## License

This project was developed as a Dicoding project capstone.
