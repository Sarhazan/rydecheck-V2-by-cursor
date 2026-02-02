# Coding Conventions

**Analysis Date:** 2026-02-02

## Naming Patterns

**Files:**
- React components: PascalCase with `.jsx` extension (e.g., `FileUpload.jsx`, `ErrorBoundary.jsx`, `AnalysisResults.jsx`)
- Utility files: camelCase with `.js` extension (e.g., `errorHandler.js`, `fileParser.js`, `activityLogger.js`)
- Hook files: camelCase with `.js` extension, prefixed with `use` (e.g., `useAnalysis.js`, `useFileUpload.js`)
- Constants files: camelCase (e.g., `gettConstants.js`)

**Functions:**
- Component functions: PascalCase (e.g., `FileUpload`, `ErrorBoundary`, `DepartmentBreakdown`)
- Utility functions: camelCase (e.g., `extractPids`, `normalizeLocation`, `logActivity`)
- Handler/callback functions: camelCase prefixed with `handle` or `on` (e.g., `handleFileUpload`, `onUpdatePrice`, `handleDragEnter`)
- Exported functions: camelCase (e.g., `logError`, `getUserFriendlyError`, `parseFile`)

**Variables:**
- State variables: camelCase (e.g., `files`, `parsedData`, `matchResults`, `isAnalyzing`)
- Map/Set variables: camelCase with suffix indicating type (e.g., `manuallyAddedRides`, `employeeMap`, `tripsRemovedFromReview`, `updatedPrices`)
- Event handler parameters: camelCase (e.g., `e` for events)
- Temporary/loop variables: descriptive camelCase (e.g., `rideId`, `supplier`, `department`)

**Types/Objects:**
- Object keys: camelCase (e.g., `rideId`, `supplierData`, `priceDifference`)
- Enum-like objects: camelCase keys (e.g., supplier names stored as `bontour`, `hori`, `gett`)
- Map keys: descriptive format matching purpose (e.g., `${rideId}-${employeeId}`, `ride-${rideId}`)

## Code Style

**Formatting:**
- Tool: Prettier v3.7.4
- Semi-colons: true
- Trailing commas: es5
- Single quotes: true
- Print width: 100 characters
- Tab width: 2 spaces
- No tabs (spaces only)
- Arrow parens: avoid (omit parens for single parameters)
- Line endings: LF

**Configuration file:** `.prettierrc`

**Linting:**
- Tool: ESLint v9.39.2
- Config: `.eslintrc.js`
- Key plugins: `react`, `react/jsx-runtime`
- React version detection: automatic

**Key ESLint rules:**
- `react/prop-types`: warn (PropTypes validation suggested but not required)
- `no-unused-vars`: warn with pattern `^_` to allow intentional unused (prefixed with `_`)
- `no-console`: warn, allows `console.warn` and `console.error` (dev logs permitted, regular logs flagged)
- All ESLint recommended rules enabled
- All React recommended rules enabled

## Import Organization

**Order:**
1. React imports (e.g., `import { useState, useCallback } from 'react'`)
2. Third-party libraries (e.g., `import { motion, AnimatePresence } from 'framer-motion'`)
3. Components (e.g., `import FileUpload from './components/FileUpload'`)
4. Utils/hooks (e.g., `import { parseFile } from './utils/fileParser'`)
5. Icons (e.g., `import { Loader2, FileText } from 'lucide-react'`)
6. Styles (e.g., `import './index.css'`)

**Comments in imports:**
- Section comments above import groups: `// React`, `// Framer Motion`, `// Components`, etc.

**Barrel exports:**
- Main barrel file: `src/utils/index.js` exports commonly used utilities
- Organized by category (Error handling, File parsing, Ride matching, Activity logging, etc.)

## Error Handling

**Patterns:**
- Centralized error handler function: `handleError(error, context, setError, additionalInfo)` in `src/utils/errorHandler.js`
- User-friendly error messages via `getUserFriendlyError()` - translates error types to Hebrew messages
- Error logging via `logError()` - captures error details, context, timestamp, and additional info
- Try-catch blocks in async functions with handleError in catch block
- Error state propagated to UI via state setter passed to handleError

**Example pattern:**
```javascript
try {
  setIsAnalyzing(true);
  setError(null);
  // operation
} catch (err) {
  handleError(err, 'ביצוע ניתוח', setError);
} finally {
  setIsAnalyzing(false);
}
```

## Logging

**Framework:** console (development only) for standard logs, console.error/warn for errors

**Patterns:**
- Conditional logging in development: `if (import.meta.env.DEV) { console.error(...) }`
- Error context is always included in error logs
- Activity logging uses dedicated `logActivity()` function for tracking ride modifications
- Activity logs stored in-memory during session
- Log format: structured objects with id, type, rideId, timestamp, rideData, actionDetails

## Comments

**When to comment:**
- JSDoc comments above functions explaining purpose, parameters, and returns
- Inline comments for complex logic (Hebrew comments used for clarity, especially in data manipulation)
- Explanatory comments for non-obvious business logic (e.g., why certain supplier fields are checked)
- Comments above Map variable declarations explaining what they store (e.g., `// Map<rideId, note>`)

**JSDoc/TSDoc:**
- Function comments use JSDoc format: `@param`, `@returns`, `@type`
- Parameters documented with type and description
- Return values documented with type and description
- Example from codebase:

```javascript
/**
 * הוספת פעולה ללוג
 * @param {string} type - סוג הפעולה: 'ride_removed', 'ride_added', 'price_updated'
 * @param {number|string} rideId - מזהה הנסיעה
 * @param {Object} rideData - שדות הנסיעה (מקור, יעד, תאריך, מחיר, נוסעים)
 * @param {Object} actionDetails - פרטי הפעולה
 */
export function logActivity(type, rideId, rideData, actionDetails = {}) { ... }
```

## Function Design

**Size:** Functions are typically 30-150 lines; complex data processing functions can exceed this (e.g., rideMatcher.js functions are 100-200 lines)

**Parameters:**
- Functions use destructuring for component props (e.g., `function FileUpload({ fileType, label, onFileUpload, currentFile, itemCount })`)
- Utility functions receive specific arguments plus optional config objects
- Callbacks use useCallback hook in React components
- Multiple related parameters grouped in objects when count exceeds 3-4

**Return values:**
- Utility functions return transformed data or status
- Components return JSX
- Hooks return functions or computed values
- Event handlers return nothing (void), set state instead
- Promise-based functions used with async/await pattern

## Module Design

**Exports:**
- Utilities export named functions (e.g., `export function parseFile(...)`)
- Components export default: `export default ComponentName`
- Barrel file (`utils/index.js`) uses named exports to aggregate utilities

**Barrel files:**
- `src/utils/index.js` centrally exports all utility functions organized by category
- Components use direct imports from specific files (no barrel file in components)

**Example barrel file structure:**
```javascript
// Error handling
export { handleError, logError, getUserFriendlyError } from './errorHandler';

// File parsing
export { parseFile } from './fileParser';

// Activity logging
export { logActivity, getAllActivities, clearActivities, getActivityCount } from './activityLogger';
```

## React Patterns

**Component structure:**
- Functional components using hooks
- Memoization via `memo()` for performance (e.g., `memo(function FileUpload({ ... }) { ... })`)
- Props validated with PropTypes even with warn severity
- defaultProps defined for optional props

**Hooks usage:**
- `useState`: state management
- `useCallback`: memoized callbacks with dependency arrays
- `useMemo`: memoized computed values
- `useRef`: references to DOM elements (file input, drag counter)
- Custom hooks extracted to `src/hooks/` (e.g., `useAnalysis.js`, `useFileUpload.js`)

**State management:**
- Lifted state to parent (App.jsx) for shared data
- Maps used for complex state (prices, notes, department assignments)
- Sets used for collections (removed rides, trips under review)
- Multiple useState calls for separate concerns

**Event handling:**
- useCallback memoization on all event handlers
- Event delegation patterns (e.g., checking `e.target.tagName` to avoid nested button clicks)
- Drag/drop events with counter tracking (dragCounter.current)

## CSS & Styling

**Framework:** Tailwind CSS v3.4.0
- Utility classes exclusively (no custom CSS in components)
- Gradient utilities for backgrounds and text effects
- Motion libraries (Framer Motion) for animations

---

*Convention analysis: 2026-02-02*
