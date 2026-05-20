# PLENRO MS (Maintenance System)

## Project Overview

This is a full-stack web application designed for a provincial environment and natural resources office (PLENRO). It features a dashboard with various modules (assessments, delivery receipts, permits, reports, document tracking) and includes an AI-powered "Ordinance Bot".

### Technology Stack

**Frontend:**
- **Framework:** React 19, initialized with Vite.
- **Routing:** React Router (`react-router-dom`).
- **Styling:** Tailwind CSS, PostCSS.
- **UI Components:** Radix UI primitives, Tremor (`@tremor/react`) for dashboards and charts.
- **Icons:** `react-icons`.
- **Other libraries:** `recharts` for charting, `@tanstack/react-table` for data tables, `docx` and `exceljs` for document/spreadsheet generation.

**Backend:**
- **Environment:** Node.js.
- **Framework:** Express (`express`).
- **Database:** Microsoft SQL Server (`mssql`).
- **AI Integration:** Mistral AI (`@mistralai/mistralai`) and/or Groq, typically used for an Ordinance Bot feature.
- **Other libraries:** `bcrypt` for hashing, `cors` for cross-origin resource sharing, `mammoth` for DOCX parsing.

---

## Directory Structure

- `/src`: Frontend source code. Contains React components (`/components`), pages (`/pages`), context (`/context`), custom hooks (`/hooks`), services (`/services`), styles (`/styles`), and utility functions (`/utils`).
- `/backend`: Backend Express application source code.
  - `/backend/server.js`: Main entry point for the Express app.
  - `/backend/utils`: Backend utility scripts (logger, ordinance parser, date/time helpers).
- `/public`: Static assets served directly by the web server.
- `/reference`: Documentation, templates, or project standards files.

---

## Building and Running

### Prerequisites
- Node.js (v18 or higher recommended).
- Microsoft SQL Server instance.
- Valid `.env` files for both the frontend (if applicable) and backend.

### Setup and Running the Backend
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the example environment file and configure it:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` to set `DB_SERVER`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and optionally AI API keys.*
4. Start the development server:
   ```bash
   npm run dev
   ```
   *(By default, this will run on `http://localhost:5006` or `http://localhost:5000` based on your setup. The frontend Vite proxy targets port 5006).*

### Setup and Running the Frontend
1. In the root directory, install dependencies:
   ```bash
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *(This starts the frontend on `http://localhost:6005` or `http://localhost:5173`).*

---

## Development Conventions

- **Code Formatting:** The project uses Prettier. You can format the code by running `npm run format`.
- **Linting:** ESLint is configured to enforce code quality. Run `npm run lint`.
- **Environment Variables:**
  - The backend loads its environment from `backend/.env` first, and falls back to a root `.env` for shared variables like `VITE_ATTACHMENTS_BASE_PATH`.
- **Database:** The backend connects to an MS SQL Server via `mssql`. Queries are primarily raw SQL statements executed using the `mssql` connection pool configured in `server.js`.
- **AI Features:** The backend implements an Ordinance bot, consuming `.docx` or raw text via `mammoth`/custom parsers and querying Mistral AI / Groq APIs.
