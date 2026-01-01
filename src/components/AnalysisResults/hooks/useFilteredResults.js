import { useMemo } from 'react';
import { 
  filterByStatus, 
  filterByCancellations, 
  filterByReview 
} from '../../../utils/supplierHelpers';

/**
 * Hook לסינון ומיון תוצאות לפי הספק והסטטוס הנבחרים
 * @param {Object} matchResults - תוצאות ההתאמות לכל ספק
 * @param {string} selectedSupplier - הספק הנבחר ('bontour', 'hori', 'gett')
 * @param {string} statusFilter - פילטר סטטוס ('all', 'matched', 'price_difference', וכו')
 * @param {string} cancellationFilter - פילטר ביטולים ('all' | 'no_cancellations')
 * @param {string} reviewFilter - פילטר בדיקה ('all' | 'not_review' | 'for_review')
 * @param {string} priceDiffFilter - פילטר הפרשי מחיר ('all' | 'credit' | 'debit')
 * @param {Set} tripsForReviewByRide - Set של rideIds שנמצאות בבדיקה
 * @param {Function} parseDateForSort - פונקציה לפרסור תאריך למיון
 * @param {Function} getPrice - פונקציה לקבלת מחיר מעודכן או מקורי
 * @param {Map} updatedPrices - Map של מחירים מעודכנים
 * @returns {Array} מערך מסונן וממוין של תוצאות
 */
export function useFilteredResults(
  matchResults,
  selectedSupplier,
  statusFilter,
  cancellationFilter,
  reviewFilter,
  priceDiffFilter,
  tripsForReviewByRide,
  parseDateForSort,
  getPrice,
  updatedPrices
) {
  const currentResults = useMemo(() => {
    const results = matchResults[selectedSupplier] || [];
    
    // סינון לפי סטטוס
    let filtered = filterByStatus(results, statusFilter, selectedSupplier);
    
    // סינון לפי ביטולים (רק עבור גט + missing_in_ride)
    filtered = filterByCancellations(filtered, selectedSupplier, statusFilter, cancellationFilter);
    
    // סינון לפי בדיקה (רק עבור גט + missing_in_supplier)
    filtered = filterByReview(filtered, selectedSupplier, statusFilter, reviewFilter, tripsForReviewByRide);
    
    // סינון לפי הפרשי מחיר (רק עבור price_difference)
    if (statusFilter === 'price_difference' && priceDiffFilter !== 'all') {
      filtered = filtered.filter(r => {
        if (!r.ride || !r.supplierData) return false;
        const rideId = r.ride.rideId;
        const ridePrice = getPrice(rideId, r.ride.price);
        const supplierPrice = r.supplierData.price || 0;
        
        if (priceDiffFilter === 'credit') {
          // הפרשי זכות: רייד > ספק
          return ridePrice > supplierPrice;
        } else if (priceDiffFilter === 'debit') {
          // הפרשי חובה: ספק > רייד
          return supplierPrice > ridePrice;
        }
        return true;
      });
    }
    
    // מיון לפי תאריך
    return [...filtered].sort((a, b) => {
      const getDate = (match) => {
        if (match.ride && match.ride.date) {
          return match.ride.date;
        }
        if (match.supplierData && match.supplierData.date) {
          return match.supplierData.date;
        }
        return '';
      };
      
      const dateA = parseDateForSort(getDate(a));
      const dateB = parseDateForSort(getDate(b));
      
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      return dateA - dateB;
    });
  }, [
    matchResults, 
    selectedSupplier, 
    statusFilter, 
    cancellationFilter, 
    reviewFilter, 
    priceDiffFilter,
    tripsForReviewByRide, 
    parseDateForSort,
    getPrice,
    updatedPrices
  ]);

  return currentResults;
}
