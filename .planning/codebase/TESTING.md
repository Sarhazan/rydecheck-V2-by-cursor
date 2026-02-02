# Testing Patterns

**Analysis Date:** 2026-02-02

## Test Framework

**Status:** No testing framework detected
- **Runner:** Not configured (no Jest, Vitest, etc. found)
- **Assertion Library:** Not configured
- **Test files:** None found in codebase (no *.test.js, *.spec.js files)

**Build system:** Vite v5.0.8 (development server, not test runner)

## Why Tests Are Absent

The codebase is a React dashboard application with complex data processing logic but currently lacks:
- Unit test coverage
- Integration test infrastructure
- E2E test setup
- Mock frameworks

Testing infrastructure needs to be added. See CONCERNS.md for testing gaps and recommendations.

## Testing Approach (Inferred from Code Structure)

Based on code organization, testing should follow these patterns:

### Unit Test Structure (Recommended)

**Test location:** Co-located with source
- Utility tests: `src/utils/__tests__/fileName.test.js`
- Hook tests: `src/hooks/__tests__/hookName.test.js`
- Component tests: `src/components/__tests__/ComponentName.test.jsx`

**Recommended framework:** Vitest (modern, Vite-native) or Jest

**Example test structure for utilities:**
```javascript
// src/utils/__tests__/errorHandler.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { handleError, logError, getUserFriendlyError } from '../errorHandler';

describe('errorHandler', () => {
  describe('getUserFriendlyError', () => {
    it('should return default message when error is null', () => {
      const result = getUserFriendlyError(null, 'Default');
      expect(result).toBe('Default');
    });

    it('should return specific message for known error types', () => {
      const error = new Error('ParseError');
      const result = getUserFriendlyError(error);
      expect(result).toContain('ניתוח הקובץ');
    });
  });

  describe('logError', () => {
    it('should capture error details with context', () => {
      const error = new Error('Test error');
      const result = logError(error, 'testContext', { extra: 'data' });
      expect(result.context).toBe('testContext');
      expect(result.extra).toBe('data');
      expect(result.timestamp).toBeDefined();
    });
  });
});
```

### Component Test Structure (Recommended)

**Testing library:** React Testing Library (standard for React components)

**Example pattern for components:**
```javascript
// src/components/__tests__/FileUpload.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileUpload from '../FileUpload';

describe('FileUpload', () => {
  const mockOnFileUpload = vi.fn();

  it('should render file upload area', () => {
    render(
      <FileUpload
        fileType="ride"
        label="Upload Ride File"
        onFileUpload={mockOnFileUpload}
      />
    );
    expect(screen.getByText(/Upload Ride File/i)).toBeInTheDocument();
  });

  it('should call onFileUpload with file when file is selected', async () => {
    const user = userEvent.setup();
    render(
      <FileUpload
        fileType="ride"
        label="Upload"
        onFileUpload={mockOnFileUpload}
      />
    );

    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByRole('textbox', { hidden: true });

    await user.upload(input, file);
    expect(mockOnFileUpload).toHaveBeenCalled();
  });
});
```

### Hook Test Structure (Recommended)

**Testing library:** React Testing Library with `renderHook`

**Example pattern:**
```javascript
// src/hooks/__tests__/useAnalysis.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAnalysis } from '../useAnalysis';

describe('useAnalysis', () => {
  const mockSetters = {
    setMatchResults: vi.fn(),
    setDepartmentData: vi.fn(),
    setIsAnalyzing: vi.fn(),
    setError: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate required data before analysis', async () => {
    const parsedData = {
      rides: [],
      employeeMap: new Map()
    };

    const { result } = renderHook(() =>
      useAnalysis(
        parsedData,
        new Map(),
        new Map(),
        new Set(),
        ...Object.values(mockSetters)
      )
    );

    await result.current();

    expect(mockSetters.setError).toHaveBeenCalledWith('אנא טען קובץ רייד');
  });
});
```

## Mocking Patterns (For When Tests Are Implemented)

**Framework:** Vitest's built-in mocking or Jest mock utilities

**What to mock:**
- File parsing functions (avoid actual file I/O)
- External library calls (XLSX, PapaParse)
- Date/time for consistent test results
- Redux store or state management (not used here, but App state in components)

**What NOT to mock:**
- Utility functions like `normalizeLocation`, `extractPids` (test actual logic)
- Pure data transformation functions
- Business logic in rideMatcher.js

**Example mock pattern:**
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('fileParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse CSV data correctly', () => {
    // Instead of reading actual files, mock XLSX or Papa Parse
    const mockData = [
      { _ID: '1', source: 'TLV', destination: 'JLM', price: '100' }
    ];

    // Test parsing logic directly with mock data
    expect(parseRidesFromData(mockData)).toEqual([
      { rideId: 1, source: 'TLV', destination: 'JLM', price: 100 }
    ]);
  });
});
```

**Mock browser APIs:**
```javascript
// For FileReader/File uploads
global.FileReader = vi.fn(() => ({
  readAsText: vi.fn(),
  addEventListener: vi.fn((event, handler) => {
    if (event === 'load') {
      handler({ target: { result: 'mock file content' } });
    }
  })
}));
```

## Test Types

**Unit Tests (High Priority):**
- Utility functions: `fileParser.js`, `rideMatcher.js`, `departmentCalculator.js`
- Error handling: `errorHandler.js`
- Data transformation: `supplierHelpers.js`
- Activity logging: `activityLogger.js`

**Integration Tests (Medium Priority):**
- FileUpload component with file parsing
- AnalysisResults with mock match data
- DepartmentBreakdown with employee data updates
- End-to-end data flow: upload → parse → match → display

**E2E Tests (Lower Priority, Future):**
- Full user workflows (if using Cypress or Playwright)
- File upload → analysis → export flow
- Multi-step user interactions

## Coverage

**Requirements:** Not configured/enforced

**Target areas for coverage (when implementing tests):**
- Critical data parsing logic: fileParser.js, rideMatcher.js (target: 80%+)
- Error handling: errorHandler.js (target: 90%+)
- Utility functions: supplierHelpers.js, departmentCalculator.js (target: 85%+)
- Components: FileUpload, AnalysisResults (target: 70%+)

**View coverage (when configured):**
```bash
# Would add to package.json scripts
"test:coverage": "vitest --coverage"
```

## Common Testing Patterns (To Implement)

### Async Testing Pattern

```javascript
it('should handle async file parsing', async () => {
  const mockFile = new File(['test'], 'rides.csv');

  const result = await parseFile(mockFile, 'ride');

  expect(result).toHaveLength(1);
  expect(result[0]).toHaveProperty('rideId');
});
```

### Error Testing Pattern

```javascript
it('should throw error for invalid file type', () => {
  const invalidFile = new File(['test'], 'file.txt');

  expect(() => {
    validateFile(invalidFile, 'ride');
  }).toThrow('סוג קובץ לא תקף');
});

it('should call setError on parsing failure', async () => {
  const mockSetError = vi.fn();
  const invalidFile = new File(['invalid csv'], 'rides.csv');

  await parseFile(invalidFile, 'ride');

  // Error would be set via handleError callback
  expect(mockSetError).toHaveBeenCalled();
});
```

### Component Snapshot Testing (Use Cautiously)

```javascript
it('should render error boundary correctly on error', () => {
  const { container } = render(
    <ErrorBoundary>
      <ComponentThatThrows />
    </ErrorBoundary>
  );

  // Snapshots help catch unintended UI changes
  expect(container).toMatchSnapshot();
});
```

### Data Transformation Testing

```javascript
describe('rideMatcher', () => {
  it('should correctly match rides to supplier data', () => {
    const rides = [
      { rideId: 1, source: 'TLV', destination: 'JLM', price: 100 }
    ];

    const supplierData = {
      bontour: [
        { orderId: 'B001', source: 'תל אביב', destination: 'ירושלים', price: 100 }
      ]
    };

    const results = matchAllSuppliers(supplierData, rides, new Map());

    expect(results.bontour[0].status).toBe('matched');
    expect(results.bontour[0].priceDifference).toBe(0);
  });
});
```

## Missing Test Infrastructure

**To implement testing:**

1. Install test dependencies:
   ```bash
   npm install --save-dev vitest @testing-library/react @testing-library/dom vitest-dom
   ```

2. Create `vitest.config.js`:
   ```javascript
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';

   export default defineConfig({
     plugins: [react()],
     test: {
       globals: true,
       environment: 'jsdom',
       setupFiles: './src/test/setup.js'
     }
   });
   ```

3. Create test setup file `src/test/setup.js`

4. Add test scripts to `package.json`:
   ```json
   {
     "scripts": {
       "test": "vitest",
       "test:ui": "vitest --ui",
       "test:coverage": "vitest --coverage"
     }
   }
   ```

5. Create test files following co-located pattern

---

*Testing analysis: 2026-02-02*
