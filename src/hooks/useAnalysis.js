// React
import { useCallback } from 'react';

// Utils
import { matchAllSuppliers } from '../utils/rideMatcher';
import { calculateDepartmentBreakdown } from '../utils/departmentCalculator';
import { handleError } from '../utils/errorHandler';

/**
 * Hook לניהול ניתוח נתונים
 * @param {Object} parsedData - נתונים מפורסים
 * @param {Map} manuallyAddedRides - נסיעות שנוספו ידנית
 * @param {Map} updatedPrices - מחירים מעודכנים
 * @param {Set} tripsRemovedFromReview - נסיעות שהוסרו מבדיקה
 * @param {Function} setMatchResults - עדכון תוצאות התאמה
 * @param {Function} setDepartmentData - עדכון נתוני מחלקות
 * @param {Function} setIsAnalyzing - עדכון סטטוס ניתוח
 * @param {Function} setError - עדכון שגיאות
 * @returns {Function} runAnalysis - פונקציה להרצת ניתוח
 */
export function useAnalysis(
  parsedData,
  manuallyAddedRides,
  updatedPrices,
  tripsRemovedFromReview,
  setMatchResults,
  setDepartmentData,
  setIsAnalyzing,
  setError
) {
  const runAnalysis = useCallback(async () => {
    if (!parsedData.rides || parsedData.rides.length === 0) {
      setError('אנא טען קובץ רייד לפני הרצת ניתוח');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);

      // יצירת מערך משולב של נסיעות מקוריות + נסיעות שנוספו ידנית
      const allRides = [...parsedData.rides].map(ride => {
        // עדכון מחיר אם יש מחיר מעודכן
        if (updatedPrices.has(ride.rideId)) {
          return { ...ride, price: updatedPrices.get(ride.rideId) };
        }
        return ride;
      });
      
      // הוספת נסיעות שנוספו ידנית אם הן לא כבר ב-rides
      manuallyAddedRides.forEach((manualRide) => {
        if (!allRides.find(r => r.rideId === manualRide.rideId)) {
          // עדכון מחיר גם לנסיעות שנוספו ידנית
          const rideWithPrice = updatedPrices.has(manualRide.rideId)
            ? { ...manualRide, price: updatedPrices.get(manualRide.rideId) }
            : manualRide;
          allRides.push(rideWithPrice);
        }
      });

      if (allRides.length === 0) {
        setError('אנא טען קובץ רייד');
        return;
      }

      if (parsedData.employeeMap.size === 0) {
        setError('אנא טען קובץ מסד עובדים');
        return;
      }

      const suppliersData = {
        bontour: parsedData.bontour,
        hori: parsedData.hori,
        gett: parsedData.gett
      };

      // הרצת ניתוח התאמות
      const results = matchAllSuppliers(suppliersData, allRides, parsedData.employeeMap);

      setMatchResults(results);

      // סינון נסיעות שהוסרו מהרייד לפני חישוב ההתפלגות המחלקתית
      const filteredRidesForDepartment = allRides.filter(ride => {
        if (!ride.rideId) return true;
        if (tripsRemovedFromReview && typeof tripsRemovedFromReview.has === 'function') {
          return !tripsRemovedFromReview.has(ride.rideId);
        }
        return true;
      });

      const deptData = calculateDepartmentBreakdown(filteredRidesForDepartment, parsedData.employeeMap, parsedData.passenger55555Departments || new Map());
      setDepartmentData(deptData);

    } catch (err) {
      handleError(err, 'ביצוע ניתוח', setError);
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    parsedData,
    manuallyAddedRides,
    updatedPrices,
    tripsRemovedFromReview,
    setMatchResults,
    setDepartmentData,
    setIsAnalyzing,
    setError
  ]);

  return runAnalysis;
}
