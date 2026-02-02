# External Integrations

**Analysis Date:** 2026-02-02

## APIs & External Services

**None detected** - This is a standalone desktop/web application with no external API integrations.

## Data Storage

**Databases:**
- Not applicable - No backend database detected

**File Storage:**
- Local filesystem only
- Browser File API for file uploads (drag-and-drop in `src/components/FileUpload.jsx`)
- Client-side file processing using:
  - `papaparse` for CSV parsing
  - `xlsx` for Excel file reading

**Caching:**
- Not applicable - No caching layer detected
- State management via React hooks (useState, useCallback, useMemo)

## Authentication & Identity

**Auth Provider:**
- Custom role-based system (implicit, based on employee PIDs)
- Implementation: Employee database mapping (`employeeMap`) loaded from CSV
  - PIDs (employee IDs) used as identifiers
  - Department assignment based on employee master data
  - No user login or session management

**File Security:**
- No authentication required
- File uploads processed entirely client-side
- No sensitive data transmission to external services

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, Rollbar, or similar service
- Custom error handling in `src/utils/errorHandler.js`
- Error display via React state (`error` state in App.jsx)

**Logs:**
- Client-side activity logging via `src/utils/activityLogger.js`
- Logs stored in browser memory (in-session only)
- Activity modal displays via `src/components/ActivityLogModal.jsx`
- No persistent logging or remote logging service

## CI/CD & Deployment

**Hosting:**
- Static site deployment (Vite SPA)
- Built files: `dist/` directory
- No backend deployment required

**CI Pipeline:**
- Not detected
- Local development only via `npm run dev`
- Build command: `npm run build`

## Environment Configuration

**Required env vars:**
- None detected - Application is configuration-free
- Uses `import.meta.env.DEV` for development/production detection (Vite built-in)

**Secrets location:**
- No secrets management - No external services requiring credentials
- No `.env`, `.env.local`, or secrets files present

## Webhooks & Callbacks

**Incoming:**
- Not applicable - No webhook receivers

**Outgoing:**
- Not applicable - No external service callbacks

## Data Import Sources

**Supported File Formats:**

1. **CSV Files (Comma-Separated Values):**
   - Ride data: `parseFile(file, 'ride')`
   - Employee master data: `parseFile(file, 'employees')`
   - Parsed via: `papaparse` library in `src/utils/fileParser.js`

2. **Excel Files (XLSX format):**
   - Supplier data (Bontour, Hori, Gett): `parseFile(file, 'bontour'|'hori'|'gett')`
   - Parsed via: `xlsx` library in `src/utils/fileParser.js`
   - Column mapping for Gett in `src/utils/gettConstants.js`

3. **Demo Data:**
   - Generated in-memory via `src/utils/demoDataGenerator.js`
   - Random ride and supplier data for testing

## Data Export Targets

**Excel Reports:**
- Library: `xlsx-js-style`
- Export functions in `src/utils/excelExporter.js`:
  - `exportAnalysisReport()` - Ride matching analysis report
  - `exportDepartmentReports()` - Department-wise cost breakdown
- Lazy-loaded when export is triggered

**PDF Reports:**
- Library: `jspdf` + `jspdf-autotable`
- Export function in `src/utils/pdfExporter.js`
- Table formatting for structured data (not currently used in App.jsx)

## Third-Party Libraries Summary

**File Processing:**
- `papaparse` (5.4.1) - CSV parsing
- `xlsx` (0.18.5) - Excel file I/O
- `xlsx-js-style` (1.2.0) - Excel styling

**Document Generation:**
- `jspdf` (2.5.1) - PDF creation
- `jspdf-autotable` (3.8.3) - PDF tables
- `jszip` (3.10.1) - ZIP compression

**UI/UX:**
- `framer-motion` (12.23.26) - Animations and transitions
- `lucide-react` (0.562.0) - SVG icons
- `react` (18.2.0), `react-dom` (18.2.0) - Core framework

**Utilities:**
- `prop-types` (15.8.1) - Component prop validation

**No Backend, No APIs, No External Data Sources:**
- All processing is local/client-side
- No network requests to third-party services
- Data never leaves the user's browser

---

*Integration audit: 2026-02-02*
