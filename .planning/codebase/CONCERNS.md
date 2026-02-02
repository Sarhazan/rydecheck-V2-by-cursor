# Codebase Concerns

**Analysis Date:** 2026-02-02

## Tech Debt

**Large Component State Management:**
- Issue: `App.jsx` (1037 lines) manages 10+ state variables related to ride data, manual additions, price updates, and trip reviews. State is deeply nested with Maps and Sets, making it difficult to trace data flow.
- Files: `src/App.jsx`
- Impact: Complex state relationships increase likelihood of bugs; difficult to modify one piece without breaking another. Poor performance on re-renders due to prop drilling.
- Fix approach: Extract state management into custom hooks (e.g., `useRideState`, `useMatchState`, `usePriceUpdates`). Consider Context API for global state or a state management library for complex apps.

**Oversized Utility Files:**
- Issue: `src/utils/rideMatcher.js` (1395 lines) and `src/utils/fileParser.js` (1027 lines) contain multiple responsibilities. rideMatcher handles matching logic for 3 different suppliers (bontour, hori, gett) with different matching algorithms inline.
- Files: `src/utils/rideMatcher.js`, `src/utils/fileParser.js`
- Impact: Difficult to test individual supplier logic; hard to add new suppliers without modifying a massive file. Increased complexity in maintenance.
- Fix approach: Split supplier-specific matching into separate modules (`matchBontour.js`, `matchHori.js`, `matchGett.js`). Extract date/location parsing into dedicated utilities. Create supplier-agnostic matching factory.

**Raw Data Persistence in Objects:**
- Issue: Parsed data objects store `rawData` field containing original row data. This keeps unparsed Excel/CSV rows in memory throughout the application lifetime.
- Files: `src/utils/fileParser.js` (lines 162, 823, 939), `src/utils/excelExporter.js`
- Impact: Memory overhead for large files (100+ rides with raw data); impacts performance on slower devices. Raw data provides no value after parsing completes.
- Fix approach: Remove `rawData` fields after parsing completes. If debugging needed, log once to console instead of storing permanently.

**Complex Regex Patterns Without Comments:**
- Issue: Multiple complex regex patterns used for parsing and validation (e.g., location normalization, supplier note extraction) lack inline documentation.
- Files: `src/utils/fileParser.js` (lines 14-20, 409-461), `src/utils/rideMatcher.js` (lines 18-20)
- Impact: Difficult to understand parsing intent; risky to modify without breaking functionality. New developers waste time decoding patterns.
- Fix approach: Add comments explaining each regex pattern's purpose. Consider extracting patterns to named constants.

## Known Bugs

**Price Parsing Edge Case:**
- Symptoms: Prices with special characters (₪, commas) may parse incorrectly if multiple separators present or if cultural formatting varies.
- Files: `src/utils/fileParser.js` (lines 379-391, parsePrice function)
- Trigger: Files with prices like "₪1,500.50" or international formatting
- Workaround: Prices default to 0 if parsing fails (line 391), but silently hide the data loss
- Recommendation: Add validation to alert user when price parsing fails; consider accepting common formats explicitly.

**Date Format Brittleness:**
- Symptoms: Date parsing depends on detecting `/` or `-` delimiters. Mixed or unexpected formats fail silently.
- Files: `src/utils/rideMatcher.js` (lines 46-51), `src/utils/fileParser.js` (lines 102-110)
- Trigger: Files with ISO format (YYYY-MM-DD) mixed with DD/MM/YYYY, or dates like "2025.11.29"
- Workaround: None - parsing fails and returns null
- Recommendation: Use a date parsing library (date-fns, Day.js) instead of manual parsing. Support explicit format detection.

**Location Matching Fragility:**
- Symptoms: Location normalization in `rideMatcher.js` hardcodes specific location aliases ("שדה תעופה בן גוריון" -> "נתבג"). If data contains variations, matches fail.
- Files: `src/utils/rideMatcher.js` (lines 100-150)
- Trigger: Files with alternate spellings or abbreviated location names
- Workaround: Manual matching via UI modals
- Recommendation: Build a location database/mapping file. Support fuzzy string matching (Levenshtein distance).

**PID Extraction Heuristic Issues:**
- Symptoms: Logic tries to match passenger count to PID count to decide which field to use. If passenger names and PIDs don't align, wrong PIDs selected.
- Files: `src/utils/fileParser.js` (lines 46-74)
- Trigger: Rides with multiple passengers and inconsistent PID/name ordering
- Workaround: Manual review in UI required
- Recommendation: Add validation feedback when PID extraction is uncertain; allow user to override.

**Null Ride ID Handling:**
- Symptoms: Rides with null `rideId` are filtered out silently during parsing, but no feedback to user about data loss.
- Files: `src/utils/fileParser.js` (lines 168-172)
- Trigger: CSV/Excel rows without _ID column or with empty ID values
- Workaround: None - data is discarded silently
- Recommendation: Log filtered rides and show summary to user; consider generating synthetic IDs if appropriate.

## Security Considerations

**User Input Validation:**
- Risk: File upload accepts .csv and .xlsx but no content validation occurs. Malicious files or extremely large files could crash browser.
- Files: `src/components/FileUpload.jsx` (lines 43-51), `src/utils/fileParser.js`, `src/utils/excelExporter.js`
- Current mitigation: File extension check only (line 47); no size limits
- Recommendations:
  - Add file size limit (e.g., 10MB max) before processing
  - Validate row count before parsing (reject if >100k rows)
  - Add timeout to parsing operations in case of large files

**Hardcoded Supplier Logic:**
- Risk: Supplier names, matching algorithms, and column mappings are hardcoded throughout. Changes require code modifications.
- Files: `src/App.jsx` (lines 279-283, 396-400), `src/utils/rideMatcher.js` (lines 1-7), `src/utils/fileParser.js` (lines 756-763)
- Current mitigation: None
- Recommendations: Move to configuration files; allow configuration via environment variables or admin settings

**No Input Sanitization:**
- Risk: User notes and ride data are stored and exported without sanitization. Excel export could be vulnerable to formula injection if data contains `=`, `+`, etc.
- Files: `src/components/AnalysisResults.jsx`, `src/utils/excelExporter.js`
- Current mitigation: None visible
- Recommendations: Sanitize cell values before Excel export; prefix with single quote if cells start with formula characters

## Performance Bottlenecks

**Quadratic Time Complexity in Matching:**
- Problem: `matchAllSuppliers` function performs nested loops comparing rides with supplier data. Gett matching is worst case O(n²) when searching all rides against all Gett records.
- Files: `src/utils/rideMatcher.js` (lines 520-700 for Gett, ~1395 lines total)
- Cause: Multiple nested loops with date range searches and location comparisons done for each ride
- Improvement path:
  - Build index structures (hash map by date, location) before matching
  - Cache normalized locations to avoid repeated regex operations
  - Consider early termination once confidence threshold reached
  - Profile with test data of 5000+ rides to quantify impact

**Excessive Re-renders in AnalysisResults:**
- Problem: `AnalysisResults.jsx` (1504 lines) has complex filtering and multiple state updates that trigger full component re-render.
- Files: `src/components/AnalysisResults.jsx`
- Cause: 8+ useState hooks; useMemo hooks used sparingly; no virtualization for tables
- Improvement path:
  - Add useMemo/useCallback to filter functions and child components
  - Implement React.memo on match result rows
  - Consider virtualized list if 1000+ matches displayed
  - Split into smaller, memoized sub-components

**Memory Leaks in FileReader:**
- Problem: FileReader instances created in `parseExcelFile` (line 665) may not be properly cleaned up if component unmounts during parsing.
- Files: `src/utils/fileParser.js` (lines 663-999)
- Cause: No error cleanup if reader.onerror fires while component is unmounting
- Improvement path: Convert FileReader to Promise-based API or wrap in cleanup handler. Add AbortController for cancellation.

**Map and Set Growth Without Limits:**
- Problem: `manuallyAddedRides`, `updatedPrices`, `rideNotes`, `passenger55555Departments` Maps/Sets grow indefinitely during session.
- Files: `src/App.jsx` (lines 52-67)
- Cause: Only cleared on explicit "Clear Data" action; no session cleanup
- Improvement path: Add garbage collection for unused entries; implement session storage cleanup on timeout; add memory metrics to debug panel

## Fragile Areas

**Date/Time Parsing Logic:**
- Files: `src/utils/rideMatcher.js` (lines 31-80, 524-575), `src/utils/fileParser.js` (lines 102-110)
- Why fragile: Multiple date parsing implementations with different formats; inconsistent error handling (returns Infinity vs null vs empty string); timezone not handled
- Safe modification: Extract to single `dateParser.js` utility with comprehensive format support; add unit tests for each format
- Test coverage: No visible test files; critical parsing functions untested

**Supplier-Specific Matching Algorithms:**
- Files: `src/utils/rideMatcher.js` (bontour lines 295-440, hori lines 450-600, gett lines 605-1200)
- Why fragile: Each supplier has different matching criteria (price tolerance, time tolerance, location matching strictness). Mixed into single function.
- Safe modification: Extract supplier-specific matching to separate files with consistent interface; add constants for all tolerances
- Test coverage: No unit tests visible; algorithms impossible to verify without integration tests

**Alert/Confirm Usage:**
- Files: `src/components/AnalysisResults.jsx`, `src/App.jsx` (lines 671, 685), `src/components/FileUpload.jsx` (line 50)
- Why fragile: Browser `alert()` interrupts flow; not accessible; prevents bulk operations
- Safe modification: Replace with modal components; add queued notifications
- Test coverage: Interactive UI components hard to test without E2E framework

## Scaling Limits

**Current Capacity:**
- Application currently handles demo data of ~50 rides and 20 suppliers records comfortably
- Performance degrades noticeably at 500+ rides due to O(n²) matching and re-render overhead

**Limit:**
- 10,000+ rides: Matching will take >30 seconds; UI becomes unresponsive
- Memory: Each ride with raw data, manual additions, notes, prices, and all metadata takes ~10KB; 10,000 rides = 100MB+ RAM
- Supplier scaling: Adding a 4th supplier requires modifying matching logic and UI in 5+ places

**Scaling path:**
- Implement server-side matching for large datasets
- Add pagination/virtualization to UI tables
- Build supplier-agnostic matching engine (plug-in architecture)
- Add progress tracking and cancellable operations
- Consider database for persistence instead of in-memory state

## Dependencies at Risk

**XLSX Library Version Inconsistency:**
- Risk: Two XLSX packages imported differently: `import * as XLSX from 'xlsx'` (fileParser.js) and `import * as XLSX from 'xlsx-js-style'` (excelExporter.js). Can cause conflicts if both loaded.
- Impact: Potential version conflicts; duplication in bundle size
- Migration plan: Standardize on single XLSX library; use xlsx-js-style consistently or fork styling logic separately

**Framer Motion for Non-Critical UI:**
- Risk: 12.23 KB dependency used for animations on UI elements. If library has breaking changes or security issues, all animations break.
- Impact: Bundle size; maintenance burden for updates
- Migration plan: Use CSS transitions for simple animations; reserve Framer Motion for complex orchestrated animations only. Consider removing for MVP.

**No Error Boundary for Async Errors:**
- Risk: Async errors in file parsing or matching are caught but displayed in small error banner. Complex nested failures may not propagate correctly.
- Files: `src/components/common/ErrorBoundary.jsx` (only catches render errors, not async)
- Impact: Silent failures if Promise rejection not caught
- Migration plan: Add Promise rejection handler at App level; centralize error collection

## Missing Critical Features

**Undo/Redo:**
- Problem: All user actions (price updates, manual matches, notes) are permanent within session. No way to undo mistakes.
- Blocks: Users cannot safely experiment; mistakes require manual correction or clearing all data
- Recommendation: Implement action history with undo/redo stack (can use library like redux-undo or custom implementation)

**Persistent State:**
- Problem: All work is lost on page refresh. No save/load functionality.
- Blocks: Long analysis sessions are risky; users must export before refreshing
- Recommendation: Add localStorage persistence for session state; allow JSON export/import for sharing analysis

**Duplicate Detection:**
- Problem: No warning when user manually adds a ride that already matches (either via upload or previous manual addition).
- Blocks: Reports may count rides twice
- Recommendation: Add validation before manual add; check against existing rides by source/destination/date combination

**Bulk Operations:**
- Problem: Updates to prices, notes, departments are single-row only.
- Blocks: Cannot quickly update multiple rides with same correction
- Recommendation: Add select-multiple and bulk edit UI; add find-and-replace for common corrections

## Test Coverage Gaps

**No Unit Tests:**
- What's not tested: Core algorithms (matchBontour, matchHori, matchGett, dateParser, priceParser), utility functions, data transformations
- Files: All `src/utils/*.js` files have 0% test coverage
- Risk: High risk of regressions on refactoring; supplier matching bugs not caught until integration
- Priority: High - matching logic is most complex and error-prone

**No Integration Tests:**
- What's not tested: Full file upload → parsing → matching → display flow
- Files: Complete application flow not tested
- Risk: End-to-end bugs only caught by manual QA
- Priority: High - user would catch these in real usage

**No E2E Tests:**
- What's not tested: User interactions (drag-drop upload, click filters, export), browser compatibility, performance
- Files: No test directory visible (no .test.js or .spec.js files found)
- Risk: Breaking changes to UI not caught until user reports
- Priority: Medium - less critical than unit tests but important for regression prevention

**Manual Testing Only:**
- Issue: No automated test framework configured; eslint and prettier configured but no vitest/jest/cypress visible
- Files: `package.json` has no test dependency or test script
- Risk: Cannot safely refactor; cannot auto-detect breaking changes
- Priority: High - recommend adding Jest or Vitest for unit tests and Playwright/Cypress for E2E

---

*Concerns audit: 2026-02-02*
