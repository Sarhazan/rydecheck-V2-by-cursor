# Architecture

**Analysis Date:** 2026-02-02

## Pattern Overview

**Overall:** Client-Server MVC with separated concerns. Frontend is a React SPA for ride supplier matching and analysis, backend is Python Flask for optional server-side processing. Currently, most business logic resides in the frontend.

**Key Characteristics:**
- Unidirectional data flow from App component down through props
- Memoized components to prevent unnecessary re-renders
- Lazy loading of heavy components (AnalysisResults, DepartmentBreakdown, ZeroPriceRides)
- Centralized utility functions for parsing, matching, and calculations
- Module-based organization with barrel exports
- Error boundary pattern for graceful error handling
- Activity logging system for user action tracking

## Layers

**Frontend (React + Vite):**
- Purpose: User interface for file upload, data analysis, and results display
- Location: `c:\dev\projects\cursor-projects\rydecheckdemoV2\src`
- Contains: React components, utilities, hooks, CSS
- Depends on: External libraries (xlsx, papaparse, framer-motion, lucide-react)
- Used by: Browsers/clients accessing the dashboard

**Utilities Layer:**
- Purpose: Core business logic extracted into reusable functions
- Location: `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\utils`
- Contains: File parsing, ride matching, department calculations, data export, activity logging
- Depends on: External parsing libraries (XLSX, PapaParse)
- Used by: React components and custom hooks

**Components Layer:**
- Purpose: React UI components organized by feature/domain
- Location: `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\components`
- Contains: FileUpload, AnalysisResults, DepartmentBreakdown, ZeroPriceRides, common components
- Depends on: Utilities layer, framer-motion, lucide-react
- Used by: App.jsx as main orchestrator

**Backend (Flask - Optional/Legacy):**
- Purpose: Legacy server endpoints (currently not actively used in client-side app)
- Location: `c:\dev\projects\cursor-projects\rydecheckdemoV2\backend`
- Contains: File upload routes, comparison routes, report generation
- Depends on: Flask, werkzeug, pandas (implied from requirements)
- Used by: Can be called if server-side processing needed (not integrated in current frontend)

**Styling:**
- Purpose: Tailwind CSS utility classes + custom animations
- Location: `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\index.css` and `c:\dev\projects\cursor-projects\rydecheckdemoV2\tailwind.config.js`
- Contains: Tailwind configuration, custom components, animations
- Depends on: Tailwind CSS
- Used by: All React components

## Data Flow

**File Upload to Analysis Flow:**

1. User drags/selects file → `FileUpload` component
2. `FileUpload` calls `onFileUpload` callback in `App.jsx`
3. `App.jsx` parses file using `parseFile()` from `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\utils\fileParser.js`
4. Parsed data stored in `App.jsx` state (parsedData)
5. User clicks "Analyze" → triggers `useAnalysis` hook
6. Hook calls `matchAllSuppliers()` from `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\utils\rideMatcher.js`
7. Matching results stored in `App.jsx` state (matchResults)
8. Department breakdown calculated via `calculateDepartmentBreakdown()` from `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\utils\departmentCalculator.js`
9. Results passed as props to `AnalysisResults`, `DepartmentBreakdown`, `ZeroPriceRides` components
10. User interacts with results (edit prices, add rides, export) → activities logged and state updated

**State Management:**
- Central state management in `App.jsx` using React hooks (useState, useCallback, useMemo)
- Key state pieces: `files`, `parsedData`, `matchResults`, `departmentData`, `updatedPrices`, `manuallyAddedRides`, `rideNotes`, `manualGettMatches`, `tripsForReviewByRide`, `tripsRemovedFromReview`, `activityLogs`
- No Redux/Context API for global state; props drilling used for component communication
- Maps and Sets used for efficient lookups (employeeMap, updatedPrices Map, tripsForReviewByRide Set)

## Key Abstractions

**File Parser (`c:\dev\projects\cursor-projects\rydecheckdemoV2\src\utils\fileParser.js`):**
- Purpose: Convert CSV/Excel files into normalized data structures
- Exports: `parseFile(file, fileType)` → returns Promise<rideData|supplierData|employeeData>
- Pattern: Format detection, data cleaning, PID extraction from history fields
- Handles: CSV (rides, employees), Excel (suppliers: bontour, hori, gett)

**Ride Matcher (`c:\dev\projects\cursor-projects\rydecheckdemoV2\src\utils\rideMatcher.js`):**
- Purpose: Match rides from company records to supplier records using fuzzy location/time matching
- Exports: `matchAllSuppliers(suppliersData, rides, employeeMap)` → returns { bontour, hori, gett }
- Pattern: Multi-pass matching algorithm with time/location tolerance, price comparison
- Contains: Helper functions for date parsing, location normalization, match scoring

**Department Calculator (`c:\dev\projects\cursor-projects\rydecheckdemoV2\src\utils\departmentCalculator.js`):**
- Purpose: Break down ride costs by employee department
- Exports: `calculateDepartmentBreakdown(rides, employeeMap)` → returns department summary object
- Pattern: Aggregates ride costs, maps to departments via employee records

**Excel Exporter (`c:\dev\projects\cursor-projects\rydecheckdemoV2\src\utils\excelExporter.js`):**
- Purpose: Export analysis results to formatted Excel files
- Exports: Dynamic import, lazy-loaded function
- Pattern: Uses XLSX and xlsx-js-style for styling; generates multi-sheet workbooks

**Activity Logger (`c:\dev\projects\cursor-projects\rydecheckdemoV2\src\utils\activityLogger.js`):**
- Purpose: Track user actions (price updates, ride additions, etc.)
- Exports: `logActivity()`, `getAllActivities()`, `clearActivities()`
- Pattern: LocalStorage-backed in-memory log; supports activity replay

## Entry Points

**Main (`c:\dev\projects\cursor-projects\rydecheckdemoV2\src\main.jsx`):**
- Location: `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\main.jsx`
- Triggers: Vite dev server or built HTML
- Responsibilities: Mount React app to DOM, wrap App in ErrorBoundary, set up React Strict Mode

**App (`c:\dev\projects\cursor-projects\rydecheckdemoV2\src\App.jsx`):**
- Location: `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\App.jsx`
- Triggers: Called from main.jsx
- Responsibilities: Central orchestrator; manages all state; renders FileUpload, AnalysisResults, controls, modals

**Backend Entry (`c:\dev\projects\cursor-projects\rydecheckdemoV2\backend\app.py`):**
- Location: `c:\dev\projects\cursor-projects\rydecheckdemoV2\backend\app.py`
- Triggers: `python -m flask run` or direct execution
- Responsibilities: Flask app initialization, blueprint registration, CORS setup

## Error Handling

**Strategy:** Try-catch in async operations, user-friendly error messages via `errorHandler.js`, error boundary for React component crashes.

**Patterns:**
- `handleError(error, context, setError, additionalInfo)` in `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\utils\errorHandler.js` standardizes error logging and state updates
- `ErrorBoundary` component (`c:\dev\projects\cursor-projects\rydecheckdemoV2\src\components\common\ErrorBoundary.jsx`) catches React errors and displays fallback UI
- Specific error messages for file parsing, matching, and analysis phases
- Console logging only in development mode (checked via `import.meta.env.DEV`)

## Cross-Cutting Concerns

**Logging:** Centralized via `logError()` in `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\utils\errorHandler.js` and `logActivity()` in `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\utils\activityLogger.js`. Activity logs stored in localStorage, error logs only to console (development).

**Validation:** Implicit through file parsing (rejects invalid formats) and type checking (PropTypes on components). No centralized validation schema library.

**Authentication:** Not implemented. Application assumes trusted environment (no user authentication).

**Localization:** Hard-coded Hebrew text throughout. UI and all user messages are in Hebrew. Comments in Hebrew with English technical terms.

---

*Architecture analysis: 2026-02-02*
