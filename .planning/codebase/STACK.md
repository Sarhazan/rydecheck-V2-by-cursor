# Technology Stack

**Analysis Date:** 2026-02-02

## Languages

**Primary:**
- JavaScript (ES2021+) - Application code, utilities, components
- JSX - React component syntax in `.jsx` files

**Secondary:**
- CSS - Styling via Tailwind CSS utilities
- HTML - Document structure (RTL-enabled for Hebrew)

## Runtime

**Environment:**
- Node.js v24.11.1+ (local development)
- Browser environment (modern browsers with ES2021+ support)

**Package Manager:**
- npm 10.x (lockfile: `package-lock.json` present)

## Frameworks

**Core:**
- React 18.2.0 - UI component framework
- ReactDOM 18.2.0 - DOM rendering for React

**Build/Dev:**
- Vite 5.0.8 - Build tool and dev server (configured in `vite.config.js`)
- @vitejs/plugin-react 4.2.1 - React plugin for Vite (with Fast Refresh)

**Styling:**
- Tailwind CSS 3.4.0 - Utility-first CSS framework
- PostCSS 8.4.32 - CSS transformation pipeline
- Autoprefixer 10.4.16 - Vendor prefix automation

**Code Quality:**
- ESLint 9.39.2 - JavaScript linting
- eslint-plugin-react 7.37.5 - React-specific rules
- Prettier 3.7.4 - Code formatting
- eslint-config-prettier 10.1.8 - Disables conflicting ESLint rules

## Key Dependencies

**Critical:**
- framer-motion 12.23.26 - Animation and motion library for smooth UI transitions
- papaparse 5.4.1 - CSV file parsing library
- xlsx 0.18.5 - Excel file reading/writing (primary spreadsheet handler)
- xlsx-js-style 1.2.0 - Enhanced Excel styling capabilities for xlsx

**Document Export:**
- jspdf 2.5.1 - PDF generation for reports
- jspdf-autotable 3.8.3 - Table formatting in PDF exports
- jszip 3.10.1 - ZIP file creation and compression

**UI/Icons:**
- lucide-react 0.562.0 - Icon library with React components
- prop-types 15.8.1 - Runtime type checking for component props

**TypeScript Definitions (Dev):**
- @types/react 18.2.43 - Type definitions for React
- @types/react-dom 18.2.17 - Type definitions for ReactDOM

## Configuration

**Environment:**
- Development: Vite dev server on port 3001 (configured in `vite.config.js`)
- No `.env` files detected - configuration appears to be code-based
- Environment detection via `import.meta.env.DEV`

**Build Configuration:**
- Vite build with code splitting:
  - `react-vendor` chunk: React and ReactDOM
  - `framer-motion` chunk: Animation library
  - `lucide-react` chunk: Icon library
  - `xlsx` chunk: Excel processing
  - `papaparse` chunk: CSV parsing
- Chunk size warning limit: 1000KB
- Output: `dist/` directory (standard Vite build output)

**Styling Configuration:**
- PostCSS pipeline: Tailwind CSS → Autoprefixer
- Tailwind config: `tailwind.config.js` with extended color palette
- CSS input: `src/index.css` with Tailwind directives

**Code Style:**
- Prettier config (`.prettierrc`):
  - 2-space indentation
  - Single quotes
  - 100-character print width
  - Trailing commas (ES5 style)
  - Semicolons enabled
  - Arrow functions without parens
  - LF line endings

- ESLint config (`.eslintrc.js`):
  - Extends: eslint:recommended, react/recommended, react/jsx-runtime, prettier
  - React version detection: automatic
  - Rules: prop-types warnings, no-unused-vars (with underscore pattern), no-console (warnings only)

## Platform Requirements

**Development:**
- Node.js 24.11.1 or compatible version
- npm 10.x
- Modern text editor with ESLint/Prettier support recommended

**Production:**
- Static hosting (SPA deployment)
- No server-side runtime required
- Browser compatibility: Modern browsers supporting ES2021+

---

*Stack analysis: 2026-02-02*
