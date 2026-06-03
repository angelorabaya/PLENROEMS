# PLENRO MS (Maintenance System)

## Project Overview

This is a full-stack web application designed for a provincial environment and natural resources office (PLENRO). It features a dashboard with various modules (assessments, delivery receipts, permits, reports, document tracking, vehicle registration, task force management) and includes an AI-powered "Ordinance Bot".

### Technology Stack

**Frontend:**
- **Framework:** React 19, initialized with Vite.
- **Routing:** React Router (`react-router-dom`).
- **Styling:** Tailwind CSS, PostCSS.
- **UI Components:** Radix UI primitives, Tremor (`@tremor/react`) for dashboards and charts.
- **Icons:** `react-icons` (primarily `react-icons/fi` for Feather icons).
- **Other libraries:** `recharts` for charting, `@tanstack/react-table` for data tables, `docx` and `exceljs` for document/spreadsheet generation, `file-saver` for downloads, `crypto-js` for encryption.

**Backend:**
- **Environment:** Node.js.
- **Framework:** Express (`express`).
- **Database:** Microsoft SQL Server (`mssql`).
- **Excel Generation:** `exceljs` for server-side Excel export with styled headers, merged cells, and formatted data.
- **AI Integration:** Mistral AI (`@mistralai/mistralai`) and/or Groq, typically used for an Ordinance Bot feature.
- **Other libraries:** `bcrypt` for hashing, `cors` for cross-origin resource sharing, `mammoth` for DOCX parsing.

---

## Directory Structure

- `/src`: Frontend source code.
  - `/src/components`: Reusable React components (Sidebar, modals, tables, etc.).
  - `/src/pages`: Page-level components, one per route.
  - `/src/context`: React context providers (ThemeContext, AuthContext).
  - `/src/hooks`: Custom React hooks.
  - `/src/services`: API service layer (`api.js` — centralized fetch functions).
  - `/src/styles`: CSS files (global styles, print-specific styles per report).
  - `/src/utils`: Utility functions (date formatting, permissions, etc.).
- `/backend`: Backend Express application source code.
  - `/backend/server.js`: Main entry point — contains all routes, DB connection, and middleware.
  - `/backend/utils`: Backend utility scripts (logger, ordinance parser, date/time helpers).
- `/public`: Static assets served directly by the web server.
- `/reference`: Documentation, templates, or project standards files.
- `/MISDeploymentServer`: Deployment-ready copy of the application.
  - `/MISDeploymentServer/backend`: Backend source + dependencies for deployment.
  - `/MISDeploymentServer/frontend/dist`: Production frontend build.
  - `/MISDeploymentServer/frontend/server.cjs`: Static file server for the frontend.

---

## Key Modules & Features

### Reports Hub (`/reports-hub`)
Central reports dashboard with categorized report cards:
- **Income Reports:** Comparative Income, Revenue Collection (with year/month filters).
- **Shares Reports:** Barangay Share, Barangay Share Breakdown, Municipal Share (with year/municipality/barangay filters).
- **Permittees Reports:** Active Permittees, Active Permittees by Municipality.
- **Vehicle Registration:** Active Registered Vehicle Records.
- **Task Force Reports:** Monthly Environmental Load Monitoring.
- **Sticker & Apprehension:** Issued Stickers, Apprehended Vehicles (with date range selector and display cards).

### Excel Export Endpoints
Reports that support "Export to Excel" with full report layout (headers, styled tables, signatory):
- `GET /api/reports/active-permittees/export` → `active_permittees.xlsx`
- `GET /api/reports/comparative-income/export?year=` → `comparative_income_{year}.xlsx`
- `GET /api/reports/active-registered-vehicle-records/export` → `active_registered_vehicles.xlsx`

Excel exports include:
- Government header (Republic of the Philippines, Province, Office name, address)
- Report title and record count
- Styled table with green (`#2D5A27`) header background and white text
- Data rows with borders and number formatting
- Signatory section (Prepared by: name, title)

### Report Signatory Configuration
- Frontend defaults in each report component: `VITE_NOTED_BY_NAME` / `VITE_NOTED_BY_TITLE`
- Backend defaults in export endpoints: `NOTED_BY_NAME` / `NOTED_BY_TITLE` env vars
- Default: **GERAN JOHN T. FLORES**, **PLENRO**

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

### Building for Production
```bash
npm run build
```
Output goes to `/dist`. To deploy, copy `/dist` to `/MISDeploymentServer/frontend/dist` and `/backend` files to `/MISDeploymentServer/backend`.

---

## Deployment

The `/MISDeploymentServer` folder contains a deployment-ready copy:
- **Backend:** `server.js`, `utils/`, `package.json`, `package-lock.json`, `.env`
- **Frontend:** `dist/` (production build), `server.cjs` (static file server)
- **Scripts:** `setup-server.bat`, `setup-server.ps1`, `restart-backend.bat`, `update-deployment-files.bat`
- **Do not** run deployment scripts from the development environment — they are for the target server.

---

## Development Conventions

- **Code Formatting:** The project uses Prettier. You can format the code by running `npm run format`.
- **Linting:** ESLint is configured to enforce code quality. Run `npm run lint`.
- **Environment Variables:**
  - The backend loads its environment from `backend/.env` first, and falls back to a root `.env` for shared variables like `VITE_ATTACHMENTS_BASE_PATH`.
- **Database:** The backend connects to an MS SQL Server via `mssql`. Queries are primarily raw SQL statements executed using the `mssql` connection pool configured in `server.js`. Date expressions use `SQL_MANILA_TODAY_EXPR` and `SQL_MANILA_NOW_EXPR` constants for Philippine timezone consistency.
- **AI Features:** The backend implements an Ordinance bot, consuming `.docx` or raw text via `mammoth`/custom parsers and querying Mistral AI / Groq APIs.
- **Print Styles:** Each printable report has a dedicated CSS file (e.g., `active-permittees-print.css`, `comparative-income-print.css`) with `@media print` rules for legal landscape layout.
- **Theme Support:** Dark/light theme via `ThemeContext`. Components use `isDark` flag for conditional Tailwind classes.
- **Button Variants:** Global CSS defines `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-outline`, `.btn-export-excel` (green Excel-themed).
