# Codebase Structure

**Analysis Date:** 2026-02-02

## Directory Layout

```
rydecheckdemoV2/
├── .cursor/                    # Cursor IDE configuration
├── .git/                       # Git repository
├── .planning/
│   └── codebase/              # GSD planning documents
├── backend/                    # Python Flask backend (legacy/optional)
│   ├── routes/                # API route blueprints
│   ├── middleware/            # Flask middleware
│   ├── venv/                  # Python virtual environment
│   ├── app.py                 # Flask app entry point
│   ├── config.py              # Configuration constants
│   ├── file_parser.py         # Server-side file parsing
│   ├── matcher.py             # Server-side ride matching
│   ├── normalizer.py          # Data normalization
│   ├── department_allocator.py # Server-side department logic
│   ├── report_generator.py    # Report generation
│   ├── email_sender.py        # Email utilities
│   └── requirements.txt       # Python dependencies
├── src/                        # React frontend source code
│   ├── components/            # React components
│   ├── utils/                 # Utility functions and business logic
│   ├── hooks/                 # Custom React hooks
│   ├── contexts/              # React Context (currently empty)
│   ├── types/                 # Type definitions (currently empty)
│   ├── App.jsx                # Root component
│   ├── main.jsx               # Vite entry point
│   └── index.css              # Global styles
├── public/                     # Static assets
├── dist/                       # Built output (ignored in source)
├── node_modules/              # npm dependencies
├── index.html                 # HTML template
├── package.json               # npm configuration
├── package-lock.json          # npm lock file
├── vite.config.js             # Vite build configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── .eslintrc.js               # ESLint configuration
├── .prettierrc                # Prettier formatting configuration
└── .gitignore                 # Git ignore rules
```

## Directory Purposes

**src/components/:**
- Purpose: React UI components organized by feature
- Contains: JSX/React components, component-specific hooks, component styling (Tailwind classes)
- Key files:
  - `FileUpload.jsx`: File drag-drop upload component
  - `AnalysisResults.jsx`: Main supplier match results display with tabs/filters
  - `DepartmentBreakdown.jsx`: Department cost breakdown component
  - `ZeroPriceRides.jsx`: Special handling for rides with zero price
  - `GettMatchModal.jsx`: Modal for manual Gett ride matching
  - `ActivityLogModal.jsx`: Modal displaying user action history
  - `common/ErrorBoundary.jsx`: Error boundary for React errors
  - `common/LoadingSpinner.jsx`: Loading indicator component
  - `AnalysisResults/` subdirectory: Sub-components and hooks for AnalysisResults

**src/utils/:**
- Purpose: Core business logic extracted as reusable utility functions
- Contains: Parsing, matching, calculations, export, logging functions
- Key files:
  - `fileParser.js`: Parses CSV (rides, employees) and Excel (suppliers)
  - `rideMatcher.js`: Fuzzy-matches supplier records to company rides
  - `departmentCalculator.js`: Calculates cost per department
  - `excelExporter.js`: Exports results to formatted Excel workbooks
  - `pdfExporter.js`: Exports results to PDF format
  - `supplierHelpers.js`: Helper functions for supplier data manipulation
  - `errorHandler.js`: Centralized error handling and logging
  - `activityLogger.js`: Tracks and stores user actions
  - `demoDataGenerator.js`: Generates random demo data for testing
  - `gettConstants.js`: Gett-specific configuration constants
  - `index.js`: Barrel file exporting all utilities

**src/hooks/:**
- Purpose: Custom React hooks for reusable stateful logic
- Contains: Hooks for file uploads, analysis running
- Key files:
  - `useAnalysis.js`: Hook for running supplier matching analysis
  - `useFileUpload.js`: Hook for file upload handling

**src/contexts/:**
- Purpose: React Context API definitions (currently unused)
- Contains: Empty placeholder for future context providers

**src/types/:**
- Purpose: Type definitions and JSDoc comments (currently empty)
- Contains: Empty placeholder for type documentation

**backend/routes/:**
- Purpose: Flask API route blueprints (legacy/optional backend)
- Contains: API endpoints for file upload, comparison, reports
- Key files:
  - `upload.py`: File upload and demo data loading endpoints
  - `compare.py`: Comparison/matching endpoints
  - `reports.py`: Report generation endpoints
  - `gett.py`: Gett-specific matching endpoints
  - `health.py`: Health check endpoint

**backend/middleware/:**
- Purpose: Flask middleware (logging, authentication, etc.)
- Contains: Custom middleware implementations
- Key files:
  - `logging.py`: Request/response logging middleware

## Key File Locations

**Entry Points:**
- `c:\dev\projects\cursor-projects\rydecheckdemoV2\index.html`: HTML root template (Vite)
- `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\main.jsx`: JavaScript entry point
- `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\App.jsx`: React root component

**Configuration:**
- `c:\dev\projects\cursor-projects\rydecheckdemoV2\vite.config.js`: Vite bundler configuration with chunk splitting
- `c:\dev\projects\cursor-projects\rydecheckdemoV2\tailwind.config.js`: Tailwind CSS theme and extensions
- `c:\dev\projects\cursor-projects\rydecheckdemoV2\.prettierrc`: Code formatting rules
- `c:\dev\projects\cursor-projects\rydecheckdemoV2\.eslintrc.js`: Linting rules
- `c:\dev\projects\cursor-projects\rydecheckdemoV2\package.json`: npm dependencies and scripts
- `c:\dev\projects\cursor-projects\rydecheckdemoV2\backend\config.py`: Python/Flask configuration

**Core Logic:**
- `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\utils\fileParser.js`: File parsing logic (44KB)
- `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\utils\rideMatcher.js`: Ride matching algorithm (54KB)
- `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\components\AnalysisResults.jsx`: Main results UI (77KB)

**Styling:**
- `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\index.css`: Base styles, custom Tailwind components, animations

**Testing:**
- No test files found. Testing infrastructure not present (empty directories only).

## Naming Conventions

**Files:**
- `.jsx` for React components
- `.js` for utility functions and non-React code
- `.py` for Python Flask backend
- kebab-case for feature directories: `common`, `AnalysisResults`
- PascalCase for component files: `FileUpload.jsx`, `ErrorBoundary.jsx`
- camelCase for utility files: `fileParser.js`, `rideMatcher.js`, `errorHandler.js`

**Directories:**
- SCREAMING_SNAKE_CASE for root-level infrastructure: `.planning`, `src`, `backend`
- camelCase for feature/domain subdirectories: `components`, `utils`, `hooks`
- kebab-case for types/organizational folders: `AnalysisResults`, `common`

**Components:**
- PascalCase for component names: `FileUpload`, `AnalysisResults`, `ErrorBoundary`
- Memoized with `memo()` wrapper to prevent unnecessary re-renders
- PropTypes defined for runtime type checking

**Functions:**
- camelCase for all function names: `parseFile()`, `matchAllSuppliers()`, `handleError()`
- Prefixed with `use` for custom hooks: `useAnalysis()`, `useFileUpload()`
- Prefixed with `is` for boolean predicates: `isMatchedStatus()`, `isPriceDifferenceMatch()`
- Prefixed with `get` for getters: `getStatusText()`, `getUserFriendlyError()`

**Variables:**
- camelCase for all variables: `matchResults`, `employeeMap`, `rideId`
- SCREAMING_SNAKE_CASE for constants: `GETT_SUPPLIER_NAMES`, `MAX_CONTENT_LENGTH`, `UPLOAD_FOLDER`
- Suffixed with `Map` for JavaScript Map instances: `employeeMap`, `updatedPrices`
- Suffixed with `Set` for JavaScript Set instances: `tripsForReviewByRide`, `guestRidesRemoved`

## Where to Add New Code

**New Feature:**
- Primary code: Create new file in `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\utils\[featureName].js` for business logic
- UI Component: Create in `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\components\[FeatureName].jsx`
- Custom Hook: Create in `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\hooks\use[FeatureName].js`
- Integration with App: Wire props/callbacks through `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\App.jsx`

**New Component/Module:**
- Implementation: `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\components/[ComponentName].jsx`
- Props: Define PropTypes at bottom of file
- Sub-components: Create subdirectory if component has multiple sub-files (e.g., `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\components\AnalysisResults\`)
- Export from parent if needed (use barrel exports)

**Utilities:**
- Shared helpers: `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\utils/[utilityName].js`
- Export from `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\utils\index.js` barrel for easy imports
- Constants: Define in dedicated constant files or at top of util file (e.g., `gettConstants.js`)

**Styles:**
- Global/base styles: Add to `c:\dev\projects\cursor-projects\rydecheckdemoV2\src\index.css` in appropriate @layer
- Component-specific: Use Tailwind utility classes directly in JSX
- Custom Tailwind classes: Define in `tailwind.config.js` under theme.extend or as custom component in index.css

**Backend Routes:**
- New endpoint: Create new file in `c:\dev\projects\cursor-projects\rydecheckdemoV2\backend\routes\[routeName].py`
- Register blueprint in `c:\dev\projects\cursor-projects\rydecheckdemoV2\backend\app.py`
- Use Flask Blueprint pattern: `api = Blueprint('name', __name__)` then `app.register_blueprint(api, url_prefix='/api')`

## Special Directories

**public/:**
- Purpose: Static assets served directly by Vite
- Generated: No (manually curated)
- Committed: Yes

**dist/:**
- Purpose: Built/compiled output from `npm run build`
- Generated: Yes (by Vite build process)
- Committed: No (in .gitignore)

**node_modules/:**
- Purpose: npm package dependencies
- Generated: Yes (by `npm install`)
- Committed: No (in .gitignore)

**backend/venv/:**
- Purpose: Python virtual environment for backend dependencies
- Generated: Yes (by `python -m venv venv`)
- Committed: No (in .gitignore)

**.cursor/:**
- Purpose: Cursor IDE workspace configuration and debug logs
- Generated: Yes (by Cursor IDE)
- Committed: No (in .gitignore)

**.planning/codebase/:**
- Purpose: GSD (GPT-Scripted Development) codebase analysis documents
- Generated: Yes (by GSD mappers)
- Committed: Yes (in repository for team reference)

---

*Structure analysis: 2026-02-02*
