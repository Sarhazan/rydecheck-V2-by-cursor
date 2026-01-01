import { useMemo, useCallback } from 'react';
import { 
  getPriceDiffCount, 
  getMissingInRideCount, 
  getMissingInSupplierCount, 
  getSupplierRidesCount,
  getAssignedToOtherSupplierCount,
  isMatchedStatus
} from '../../../utils/supplierHelpers';

/**
 * Hook לחישוב סיכום סטטיסטיקות עבור הספק הנבחר
 * @param {Object} matchResults - תוצאות ההתאמות לכל ספק
 * @param {string} selectedSupplier - הספק הנבחר ('bontour', 'hori', 'gett')
 * @param {Object} supplierRideNames - שמות אפשריים של כל ספק בקובץ הרייד
 * @param {Map} tripsRemovedFromReview - Set של rideIds שהוסרו מבדיקה
 * @param {Map} updatedPrices - Map של מחירים מעודכנים (rideId -> price)
 * @param {Map} manualGettMatches - Map של התאמות ידניות של גט
 * @param {Map} manuallyAddedRides - Map של נסיעות שנוספו ידנית
 * @returns {Object} אובייקט עם סיכום סטטיסטיקות
 */
export function useSummary(
  matchResults,
  selectedSupplier,
  supplierRideNames,
  tripsRemovedFromReview,
  updatedPrices,
  manualGettMatches,
  manuallyAddedRides
) {
  // פונקציה לקבלת מחיר מעודכן או מקורי
  const getPrice = useCallback((rideId, originalPrice) => {
    if (updatedPrices.has(rideId)) {
      return updatedPrices.get(rideId);
    }
    return originalPrice || 0;
  }, [updatedPrices]);

  const summary = useMemo(() => {
    const results = matchResults[selectedSupplier] || [];
    const supplierRidePatterns = supplierRideNames[selectedSupplier] || [];
    
    // כל נסיעה שיש לה r.ride היא נסיעה מהקובץ רייד
    // אם יש supplier, נסנן לפי הספק הנבחר
    // אם אין supplier, נכלול את כל הנסיעות (כי הן מהקובץ רייד)
    // נכלול גם נסיעות שנוספו ידנית (isManual === true)
    // עבור גט: נסיעות שהוסרו מבדיקה לא נספרות
    const ridesFromRideFile = results.filter(r => {
      if (!r.ride) {
        return false;
      }
      
      const rideId = r.ride.rideId;
      
      // נסיעות שהוסרו מבדיקה לא נספרות (עבור כל הספקים)
      if (rideId && tripsRemovedFromReview && typeof tripsRemovedFromReview.has === 'function' && tripsRemovedFromReview.has(rideId)) {
        return false;
      }
      
      // נסיעות שנוספו ידנית תמיד נכללות (כי הן חלק מרייד)
      if (r.ride.isManual) {
        return true;
      }
      
      // אם אין supplier, נכלול את כל הנסיעות (כי הן מהקובץ רייד)
      if (!r.ride.supplier || r.ride.supplier.trim() === '') {
        return true; // כל נסיעה ברייד היא נסיעה מהקובץ רייד
      }
      
      // אם יש supplier, נסנן לפי הספק הנבחר
      const rideSupplier = (r.ride.supplier || '').trim().toLowerCase();
      const matches = supplierRidePatterns.some(pattern => {
        const patternLower = pattern.toLowerCase();
        return rideSupplier.includes(patternLower) || 
               patternLower.includes(rideSupplier) ||
               rideSupplier === patternLower;
      });
      
      return matches;
    });
    
    // נסיעות ייחודיות - נשתמש ב-Set כדי למנוע כפילויות של אותו rideId
    const uniqueRideIds = new Set();
    const ridesFromRideFileUnique = ridesFromRideFile.filter(r => {
      const rideId = r.ride?.rideId;
      if (!rideId) return false;
      if (uniqueRideIds.has(rideId)) {
        return false;
      }
      uniqueRideIds.add(rideId);
      return true;
    });
    
    const totalRides = ridesFromRideFileUnique.length;
    
    // עבור בון תור וחורי: "תואמים" כולל גם התאמות עם הפרש מחיר
    // עבור גט: הפרשי מחיר הם נסיעות מתואמות שיש להן הפרש מחיר (לא סטטוס נפרד)
    // נסיעות שנוספו ידנית והתאמות ידניות של גט כבר מופיעות ב-matchResults עם סטטוס 'matched',
    // אז הן נספרות ב-results.filter ולא צריך להוסיף אותן שוב
    const matchedResults = results.filter(r => isMatchedStatus(r, selectedSupplier));
    
    // בדיקה: מספר ההתאמות לא יכול להיות גבוה ממספר הנסיעות ברייד
    // נסנן התאמות לנסיעות שלא שייכות לספק הזה או שיש להן בעיות
    const matchedFiltered = matchedResults.filter(r => {
      if (!r.ride) return false;
      const rideId = r.ride.rideId;
      
      // נסיעות שהוסרו מבדיקה לא נספרות
      if (rideId && tripsRemovedFromReview && typeof tripsRemovedFromReview.has === 'function' && tripsRemovedFromReview.has(rideId)) {
        return false;
      }
      
      // נסיעות שנוספו ידנית תמיד נכללות
      if (r.ride.isManual) {
        return true;
      }
      
      // אם אין supplier, נכלול את כל הנסיעות
      if (!r.ride.supplier || r.ride.supplier.trim() === '') {
        return true;
      }
      
      // אם יש supplier, נסנן לפי הספק הנבחר
      const rideSupplier = (r.ride.supplier || '').trim().toLowerCase();
      const matches = supplierRidePatterns.some(pattern => {
        const patternLower = pattern.toLowerCase();
        return rideSupplier.includes(patternLower) || 
               patternLower.includes(rideSupplier) ||
               rideSupplier === patternLower;
      });
      
      return matches;
    });
    
    // נסיעות ייחודיות - נשתמש ב-Set כדי למנוע כפילויות של אותו rideId בהתאמות
    const matchedRideIds = new Set();
    const matchedUnique = matchedFiltered.filter(r => {
      const rideId = r.ride?.rideId;
      if (!rideId) return false;
      if (matchedRideIds.has(rideId)) {
        return false;
      }
      matchedRideIds.add(rideId);
      return true;
    });
    
    const matched = matchedUnique.length;
    
    // שימוש ב-helper functions
    const priceDiff = getPriceDiffCount(results, selectedSupplier);
    const missingInRide = getMissingInRideCount(results, selectedSupplier, manualGettMatches, manuallyAddedRides);
    const missingInSupplier = getMissingInSupplierCount(results, selectedSupplier, manualGettMatches, tripsRemovedFromReview);
    const assignedToOtherSupplier = getAssignedToOtherSupplierCount(results, selectedSupplier, manualGettMatches);
    const notMatched = results.filter(r => r.status === 'not_matched').length;
    const missing = missingInRide + missingInSupplier + notMatched;
    
    // חישוב נסיעות ספק - זה צריך להיות המספר הכולל של נסיעות הספק
    // כל נסיעה שיש לה supplierData היא נסיעה שהספק הגיש
    // זה כולל: matched (שחלקן מתאימות לנסיעות רייד ששייכות לספק וחלקן לא), missing_in_ride, ועוד
    // חישוב מספר נסיעות הספק (supplierRides)
    // עבור גט: נסיעות missing_in_ride שהותאמו ידנית לא נספרות
    // עבור בון תור וחורי: נסיעות missing_in_ride שנוספו ידנית לא נספרות
    const supplierRides = getSupplierRidesCount(results, selectedSupplier, manualGettMatches, manuallyAddedRides);

    // חישוב מחיר לספק (רייד) - סך כל המחירים של נסיעות הרייד עבור הספק
    // כולל נסיעות שנוספו ידנית ונסיעות שהוסרו מבדיקה לא נכללות
    const ridePriceForSupplier = ridesFromRideFile.reduce((sum, r) => {
      const rideId = r.ride?.rideId;
      if (!rideId) return sum;
      // שימוש במחיר מעודכן אם קיים, אחרת המחיר המקורי
      const price = updatedPrices.has(rideId) ? updatedPrices.get(rideId) : (r.ride.price || 0);
      return sum + price;
    }, 0);

    // חישוב חשבונית ספק - סך כל המחירים של נסיעות שהספק הגיש
    const supplierInvoice = results
      .filter(r => r.supplierData !== null && r.supplierData.price !== null && r.supplierData.price !== undefined)
      .reduce((sum, r) => sum + (r.supplierData.price || 0), 0);

    // חישוב סכום הפרשי מחיר - ההפרש בין חשבונית הספק למחיר לספק (רייד)
    const totalPriceDiff = Math.abs(supplierInvoice - ridePriceForSupplier);

    return { 
      totalRides, 
      matched, 
      priceDiff, 
      missing, 
      missingInRide, 
      missingInSupplier, 
      assignedToOtherSupplier,
      totalPriceDiff, 
      supplierRides, 
      ridePriceForSupplier, 
      supplierInvoice 
    };
  }, [
    matchResults, 
    selectedSupplier, 
    supplierRideNames, 
    tripsRemovedFromReview, 
    updatedPrices, 
    getPrice,
    manualGettMatches,
    manuallyAddedRides
  ]);

  return summary;
}
