/**
 * Helper Functions לטיפול בהבדלים בין ספקים
 * מכיל לוגיקה ספציפית לספקים (בון תור, חורי, גט)
 */

/**
 * בדיקה אם יש הפרש מחיר עבור match
 * @param {Object} match - אובייקט התאמה
 * @param {string} supplier - שם הספק ('bontour', 'hori', 'gett')
 * @returns {boolean} true אם יש הפרש מחיר
 */
export function isPriceDifferenceMatch(match, supplier) {
  if (supplier === 'gett') {
    return match.status === 'matched' && 
           match.priceDifference !== null && 
           match.priceDifference !== undefined && 
           match.priceDifference > 0.01;
  } else if (supplier === 'bontour' || supplier === 'hori') {
    return match.status === 'price_difference';
  }
  return false;
}

/**
 * בדיקה אם להציג שדה הערות עבור match
 * @param {Object} match - אובייקט התאמה
 * @param {string} supplier - שם הספק ('bontour', 'hori', 'gett')
 * @returns {boolean} true אם יש להציג שדה הערות
 */
export function shouldShowNotesField(match, supplier) {
  const rideId = match.ride?.rideId;
  if (!rideId) return false;
  return isPriceDifferenceMatch(match, supplier);
}

/**
 * סינון תוצאות לפי סטטוס תוך התחשבות בהבדלים בין ספקים
 * @param {Array} results - מערך תוצאות
 * @param {string} statusFilter - סטטוס לסינון ('all', 'matched', 'price_difference', וכו')
 * @param {string} supplier - שם הספק ('bontour', 'hori', 'gett')
 * @returns {Array} מערך מסונן
 */
export function filterByStatus(results, statusFilter, supplier) {
  if (statusFilter === 'all') {
    return results;
  }

  // עבור גט: פילטר "הפרש מחיר" צריך להציג נסיעות מתואמות שיש להן הפרש מחיר
  if (supplier === 'gett' && statusFilter === 'price_difference') {
    return results.filter(r => isPriceDifferenceMatch(r, supplier));
  } else if (statusFilter === 'matched') {
    // עבור בון תור וחורי: "תואמים" כולל גם התאמות עם הפרש מחיר
    if (supplier === 'bontour' || supplier === 'hori') {
      return results.filter(r => r.status === 'matched' || r.status === 'price_difference');
    } else {
      return results.filter(r => r.status === 'matched');
    }
  } else if (supplier === 'gett' && statusFilter === 'missing_in_ride') {
    // עבור גט + missing_in_ride: רק נסיעות ללא ride
    return results.filter(r => {
      if (!r.supplierData) return false;
      // רק נסיעות ללא ride
      return !r.ride && r.status === 'missing_in_ride';
    });
  } else if (supplier === 'gett' && statusFilter === 'missing_in_ride_or_assigned_to_other') {
    // עבור גט + missing_in_ride_or_assigned_to_other: נסיעות שיש להן ride ששייך לספק אחר
    return results.filter(r => {
      if (!r.supplierData) return false;
      // צריך שיהיה ride
      if (!r.ride) return false;
      
      const rideSupplier = (r.ride.supplier || '').trim().toLowerCase();
      // אם ה-ride שייך לספק אחר (לא גט), נכלול אותו
      if (rideSupplier && !rideSupplier.includes('gett') && !rideSupplier.includes('גט')) {
        return true;
      }
      
      return false;
    });
  } else {
    return results.filter(r => r.status === statusFilter);
  }
}

/**
 * חישוב מספר הפרשי מחיר
 * @param {Array} results - מערך תוצאות
 * @param {string} supplier - שם הספק ('bontour', 'hori', 'gett')
 * @returns {number} מספר הפרשי מחיר
 */
export function getPriceDiffCount(results, supplier) {
  if (supplier === 'gett') {
    return results.filter(r => isPriceDifferenceMatch(r, supplier)).length;
  } else {
    return results.filter(r => r.status === 'price_difference').length;
  }
}

/**
 * חישוב מספר missing_in_ride
 * @param {Array} results - מערך תוצאות
 * @param {string} supplier - שם הספק ('bontour', 'hori', 'gett')
 * @param {Map} manualGettMatches - מפה של התאמות ידניות של גט (Map<rideId, orderNumber>)
 * @param {Map} manuallyAddedRides - מפה של נסיעות שנוספו ידנית (Map<key, true>)
 * @returns {number} מספר missing_in_ride
 */
export function getMissingInRideCount(results, supplier, manualGettMatches = new Map(), manuallyAddedRides = new Map()) {
  if (supplier === 'gett') {
    // עבור גט: נספר נסיעות עם supplierData שאין להן ride (missing_in_ride)
    // חוץ מאלה שהותאמו ידנית
    const filtered = results.filter(r => {
      if (!r.supplierData) return false;
      
      // נסיעה בלי ride היא missing_in_ride
      const hasRide = !!r.ride;
      if (hasRide) {
        return false; // נסיעות עם ride אינן missing_in_ride
      }
      
      // לא נספר נסיעות שהותאמו ידנית
      const gettOrderNumber = r.supplierData?.orderNumber || r.supplierData?.orderId;
      const isManuallyMatched = Array.from(manualGettMatches.values()).includes(gettOrderNumber);
      if (isManuallyMatched) return false;
      
      return true;
    });
    return filtered.length;
  } else if (supplier === 'bontour' || supplier === 'hori') {
    return results.filter(r => {
      if (r.status !== 'missing_in_ride') return false;
      // בדיקה אם הנסיעה נוספה ידנית
      const supplierOrderNumber = r.supplierData?.orderNumber || r.supplierData?.orderId;
      if (!supplierOrderNumber) return true;
      const key = `${supplier}_${supplierOrderNumber}`;
      return !manuallyAddedRides.has(key);
    }).length;
  } else {
    return results.filter(r => r.status === 'missing_in_ride').length;
  }
}

/**
 * חישוב מספר נסיעות שיש להן ride ששייך לספק אחר (רק עבור גט)
 * @param {Array} results - מערך תוצאות
 * @param {string} supplier - שם הספק ('bontour', 'hori', 'gett')
 * @param {Map} manualGettMatches - מפה של התאמות ידניות של גט (Map<rideId, orderNumber>)
 * @returns {number} מספר נסיעות עם ride ששייך לספק אחר
 */
export function getAssignedToOtherSupplierCount(results, supplier, manualGettMatches = new Map()) {
  if (supplier === 'gett') {
    const filtered = results.filter(r => {
      if (!r.supplierData) return false;
      
      // צריך שיהיה ride
      const hasRide = !!r.ride;
      if (!hasRide) {
        return false;
      }
      
      const rideSupplier = (r.ride.supplier || '').trim().toLowerCase();
      // אם ה-ride שייך לגט, זה לא "רשום על ספק אחר"
      if (rideSupplier && (rideSupplier.includes('gett') || rideSupplier.includes('גט'))) {
        return false;
      }
      
      // אם ה-ride שייך לספק אחר, זה "רשום על ספק אחר"
      if (rideSupplier && !rideSupplier.includes('gett') && !rideSupplier.includes('גט')) {
        // לא נספר נסיעות שהותאמו ידנית (כי הן כבר מתואמות)
        const gettOrderNumber = r.supplierData?.orderNumber || r.supplierData?.orderId;
        const isManuallyMatched = Array.from(manualGettMatches.values()).includes(gettOrderNumber);
        if (isManuallyMatched) {
          return false;
        }
        return true;
      }
      
      return false;
    });
    return filtered.length;
  }
  return 0; // רק עבור גט
}

/**
 * חישוב מספר missing_in_supplier
 * @param {Array} results - מערך תוצאות
 * @param {string} supplier - שם הספק ('bontour', 'hori', 'gett')
 * @param {Map} manualGettMatches - מפה של התאמות ידניות של גט (Map<rideId, orderNumber>)
 * @param {Set} tripsRemovedFromReview - Set של rideIds שהוסרו מבדיקה
 * @returns {number} מספר missing_in_supplier
 */
export function getMissingInSupplierCount(results, supplier, manualGettMatches = new Map(), tripsRemovedFromReview = new Set()) {
  if (supplier === 'gett') {
    return results.filter(r => {
      if (r.status !== 'missing_in_supplier') return false;
      const rideId = r.ride?.rideId;
      // לא נספר נסיעות שהותאמו ידנית
      if (rideId && manualGettMatches.has(rideId)) return false;
      // לא נספר נסיעות שהוסרו מבדיקה
      if (rideId && tripsRemovedFromReview && typeof tripsRemovedFromReview.has === 'function' && tripsRemovedFromReview.has(rideId)) {
        return false;
      }
      return true;
    }).length;
  } else {
    return results.filter(r => {
      if (r.status !== 'missing_in_supplier') return false;
      const rideId = r.ride?.rideId;
      // לא נספר נסיעות שהוסרו מבדיקה
      if (rideId && tripsRemovedFromReview && typeof tripsRemovedFromReview.has === 'function' && tripsRemovedFromReview.has(rideId)) {
        return false;
      }
      return true;
    }).length;
  }
}

/**
 * חישוב מספר נסיעות הספק
 * @param {Array} results - מערך תוצאות
 * @param {string} supplier - שם הספק ('bontour', 'hori', 'gett')
 * @param {Map} manualGettMatches - מפה של התאמות ידניות של גט (Map<rideId, orderNumber>)
 * @param {Map} manuallyAddedRides - מפה של נסיעות שנוספו ידנית (Map<key, true>)
 * @returns {number} מספר נסיעות הספק
 */
export function getSupplierRidesCount(results, supplier, manualGettMatches = new Map(), manuallyAddedRides = new Map()) {
  if (supplier === 'gett') {
    return results.filter(r => {
      // כל נסיעה שיש לה supplierData היא נסיעה מהספק (גם אם היא שובצה לספק אחר)
      if (!r.supplierData) return false;
      
      // נסיעות missing_in_ride שהותאמו ידנית לא נספרות
      if (r.status === 'missing_in_ride') {
        const gettOrderNumber = r.supplierData?.orderNumber || r.supplierData?.orderId;
        if (Array.from(manualGettMatches.values()).includes(gettOrderNumber)) {
          return false;
        }
      }
      return true;
    }).length;
  } else if (supplier === 'bontour' || supplier === 'hori') {
    return results.filter(r => {
      if (!r.supplierData) return false;
      // נסיעות missing_in_ride שנוספו ידנית לא נספרות
      if (r.status === 'missing_in_ride') {
        const supplierOrderNumber = r.supplierData?.orderNumber || r.supplierData?.orderId;
        if (supplierOrderNumber) {
          const key = `${supplier}_${supplierOrderNumber}`;
          if (manuallyAddedRides.has(key)) {
            return false;
          }
        }
      }
      return true;
    }).length;
  } else {
    return results.filter(r => r.supplierData !== null).length;
  }
}

/**
 * סינון לפי ביטולים (עבור גט + missing_in_ride או עבור כל הספקים + price_difference)
 * @param {Array} results - מערך תוצאות
 * @param {string} supplier - שם הספק ('bontour', 'hori', 'gett')
 * @param {string} statusFilter - סטטוס נוכחי
 * @param {string} cancellationFilter - פילטר ביטולים ('all' | 'no_cancellations')
 * @returns {Array} מערך מסונן
 */
export function filterByCancellations(results, supplier, statusFilter, cancellationFilter) {
  if (cancellationFilter === 'no_cancellations') {
    // עבור גט + missing_in_ride או missing_in_ride_or_assigned_to_other
    if (supplier === 'gett' && (statusFilter === 'missing_in_ride' || statusFilter === 'missing_in_ride_or_assigned_to_other')) {
      // "ללא ביטולים" = נסיעות שהמחיר שלהן לא 28
      return results.filter(r => {
        return !(r.supplierData && r.supplierData.price === 28);
      });
    }
    
    // עבור כל הספקים + price_difference
    if (statusFilter === 'price_difference') {
      // "ביטולי נסיעות בלבד" = רק נסיעות שהמחיר שלהן 28 (ביטול מונית)
      return results.filter(r => {
        return r.supplierData && r.supplierData.price === 28;
      });
    }
  }
  return results;
}

/**
 * סינון לפי בדיקה (רק עבור גט + missing_in_supplier)
 * @param {Array} results - מערך תוצאות
 * @param {string} supplier - שם הספק ('bontour', 'hori', 'gett')
 * @param {string} statusFilter - סטטוס נוכחי
 * @param {string} reviewFilter - פילטר בדיקה ('all' | 'not_review' | 'for_review')
 * @param {Set} tripsForReviewByRide - Set של rideIds שנמצאות בבדיקה
 * @returns {Array} מערך מסונן
 */
export function filterByReview(results, supplier, statusFilter, reviewFilter, tripsForReviewByRide = new Set()) {
  if (supplier === 'gett' && statusFilter === 'missing_in_supplier') {
    if (reviewFilter === 'not_review') {
      return results.filter(trip => {
        const rideId = trip.ride?.rideId;
        if (!rideId) return true;
        if (!tripsForReviewByRide || typeof tripsForReviewByRide.has !== 'function') {
          return true;
        }
        return !tripsForReviewByRide.has(rideId);
      });
    } else if (reviewFilter === 'for_review') {
      return results.filter(trip => {
        const rideId = trip.ride?.rideId;
        if (!rideId) return true;
        if (!tripsForReviewByRide || typeof tripsForReviewByRide.has !== 'function') {
          return false;
        }
        return tripsForReviewByRide.has(rideId);
      });
    }
  }
  return results;
}

/**
 * בדיקה אם match הוא matched (תוך התחשבות בהבדלים בין ספקים)
 * @param {Object} match - אובייקט התאמה
 * @param {string} supplier - שם הספק ('bontour', 'hori', 'gett')
 * @returns {boolean} true אם matched
 */
export function isMatchedStatus(match, supplier) {
  if (supplier === 'bontour' || supplier === 'hori') {
    return match.status === 'matched' || match.status === 'price_difference';
  } else {
    return match.status === 'matched';
  }
}
