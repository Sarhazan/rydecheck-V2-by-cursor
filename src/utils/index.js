/**
 * Barrel exports - ייצוא מרכזי של כל ה-utilities
 */

// Error handling
export { handleError, logError, getUserFriendlyError } from './errorHandler';

// File parsing
export { parseFile } from './fileParser';

// Ride matching
export { matchAllSuppliers } from './rideMatcher';

// Department calculations
export { calculateDepartmentBreakdown } from './departmentCalculator';

// Activity logging
export { logActivity, getAllActivities, clearActivities, getActivityCount } from './activityLogger';

// Supplier helpers
export {
  isPriceDifferenceMatch,
  shouldShowNotesField,
  filterByStatus,
  getPriceDiffCount,
  getMissingInRideCount,
  getMissingInSupplierCount,
  getSupplierRidesCount,
  getAssignedToOtherSupplierCount,
  filterByCancellations,
  filterByReview,
  isMatchedStatus
} from './supplierHelpers';

// Demo data
export { generateAllDemoData } from './demoDataGenerator';

// Constants
export { GETT_EMPTY_COLUMN_MAPPING, GETT_COLUMN_NAMES } from './gettConstants';
