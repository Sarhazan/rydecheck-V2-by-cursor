// React
import { useState, useCallback, useMemo, lazy, Suspense } from 'react';

// Framer Motion
import { motion, AnimatePresence } from 'framer-motion';

// Components
import FileUpload from './components/FileUpload';
import ActivityLogModal from './components/ActivityLogModal';

// Utils
import { parseFile } from './utils/fileParser';
import { matchAllSuppliers } from './utils/rideMatcher';
import { calculateDepartmentBreakdown } from './utils/departmentCalculator';
import { generateAllDemoData } from './utils/demoDataGenerator';
import { logActivity, getAllActivities } from './utils/activityLogger';
import { handleError } from './utils/errorHandler';

// Icons
import { Loader2, FileText, BarChart3, Download, Trash2, Play, AlertCircle, List } from 'lucide-react';

// Lazy loading for heavy components
const AnalysisResults = lazy(() => import('./components/AnalysisResults'));
const DepartmentBreakdown = lazy(() => import('./components/DepartmentBreakdown'));
const ZeroPriceRides = lazy(() => import('./components/ZeroPriceRides'));

// Lazy loading for excel exporter (only loaded when needed)
const loadExcelExporter = () => import('./utils/excelExporter');

function App() {
  const [files, setFiles] = useState({
    ride: null,
    bontour: null,
    hori: null,
    gett: null,
    employees: null
  });

  const [parsedData, setParsedData] = useState({
    rides: [],
    employees: [],
    employeeMap: new Map(),
    bontour: [],
    hori: [],
    gett: []
  });

  const [matchResults, setMatchResults] = useState(null);
  const [departmentData, setDepartmentData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [manuallyAddedRides, setManuallyAddedRides] = useState(new Map());
  const [updatedPrices, setUpdatedPrices] = useState(new Map());
  const [manualGettMatches, setManualGettMatches] = useState(new Map());
  const [rideNotes, setRideNotes] = useState(new Map()); // Map<rideId, note>
  const [tripsForReviewByRide, setTripsForReviewByRide] = useState(() => {
    return new Set();
  }); // Set<rideId> - נסיעות שנמצאות בבדיקה
  
  const [tripsRemovedFromReview, setTripsRemovedFromReview] = useState(() => {
    return new Set();
  }); // Set<rideId> - נסיעות שהוסרו מבדיקה (לא צריכות שיוך)
  const [passenger55555Departments, setPassenger55555Departments] = useState(new Map()); // Map<rideId, departmentName> - שיוך מחלקתי לנסיעות עם נוסע 55555
  const [guestRidesRemoved, setGuestRidesRemoved] = useState(() => {
    return new Set();
  }); // Set<rideId> - נסיעות אורח שהוסרו מהרשימה
  const [activityLogs, setActivityLogs] = useState([]); // מערך של פעולות שבוצעו
  const [showActivityLogModal, setShowActivityLogModal] = useState(false); // האם מודל הלוגים פתוח

  const handleFileUpload = useCallback(async (file, fileType) => {
    if (!file) {
      setFiles(prev => ({ ...prev, [fileType]: null }));
      if (fileType === 'employees') {
        setParsedData(prev => ({ ...prev, employees: [], employeeMap: new Map() }));
      } else if (fileType === 'ride') {
        setParsedData(prev => ({ ...prev, rides: [] }));
      } else {
        setParsedData(prev => ({ ...prev, [fileType]: [] }));
      }
      return;
    }

    setFiles(prev => ({ ...prev, [fileType]: file }));
    setError(null);

    try {
      const data = await parseFile(file, fileType);
      
      if (fileType === 'employees') {
        setParsedData(prev => {
          return {
            ...prev,
            employees: data.employees,
            employeeMap: data.employeeMap
          };
        });
      } else if (fileType === 'ride') {
        setParsedData(prev => {
          return { ...prev, rides: data };
        });
      } else {
        setParsedData(prev => {
          return { ...prev, [fileType]: data };
        });
      }
    } catch (err) {
      handleError(err, `טעינת קובץ ${fileType}`, setError, { fileType });
    }
  }, []);

  const loadDemoData = useCallback(async () => {
    try {
      setError(null);
      setIsAnalyzing(true);
      
      // יצירת נתוני דמו אקראיים
      const demoData = generateAllDemoData();
      
      // עדכון state עם הנתונים
      setParsedData({
        rides: demoData.rides,
        employees: demoData.employees,
        employeeMap: demoData.employeeMap,
        bontour: demoData.bontour,
        hori: demoData.hori,
        gett: demoData.gett
      });
      
      // עדכון files state (רק לצורך הצגה, לא קבצים אמיתיים)
      setFiles({
        ride: { name: 'קובץ רייד דמו.csv' },
        bontour: { name: 'בון תור דמו.xlsx' },
        hori: { name: 'חורי דמו.xlsx' },
        gett: { name: 'גט דמו.xlsx' },
        employees: { name: 'מסד עובדים דמו.csv' }
      });
      
    } catch (err) {
      handleError(err, 'טעינת נתוני דמו', setError);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setFiles({
      ride: null,
      bontour: null,
      hori: null,
      gett: null,
      employees: null
    });
    setParsedData({
      rides: [],
      employees: [],
      employeeMap: new Map(),
      bontour: [],
      hori: [],
      gett: []
    });
    setMatchResults(null);
    setDepartmentData(null);
    setError(null);
    setManuallyAddedRides(new Map());
    setUpdatedPrices(new Map());
    setManualGettMatches(new Map());
    setPassenger55555Departments(new Map());
    setGuestRidesRemoved(new Set());
    setActivityLogs([]);
  }, []);

  /**
   * עדכון matchResults עבור נסיעה שהמחיר שלה עודכן ידנית
   * מחשב מחדש את priceDifference ומעדכן את status בהתאם
   */
  const updateMatchResultsForRide = useCallback((matchResults, rideId, updatedPrice) => {
    if (!matchResults || !rideId || updatedPrice === null || updatedPrice === undefined) {
      return matchResults;
    }

    const updatedResults = { ...matchResults };
    const suppliers = ['bontour', 'hori', 'gett'];

    suppliers.forEach(supplier => {
      if (!updatedResults[supplier] || !Array.isArray(updatedResults[supplier])) {
        return;
      }

      updatedResults[supplier] = updatedResults[supplier].map(match => {
        // בדיקה אם ההתאמה קשורה לנסיעה שהמחיר שלה עודכן
        if (!match.ride || match.ride.rideId !== rideId) {
          return match;
        }

        // בדיקה שיש supplierData עם מחיר
        if (!match.supplierData || match.supplierData.price === null || match.supplierData.price === undefined) {
          return match;
        }

        // חישוב מחדש של הפרש המחיר
        const supplierPrice = match.supplierData.price || 0;
        const newPriceDiff = Math.abs(updatedPrice - supplierPrice);
        const hasPriceDifference = newPriceDiff > 0.01;

        // יצירת העתק של ההתאמה עם העדכונים
        const updatedMatch = {
          ...match,
          priceDifference: newPriceDiff,
          // עדכון ride object עם המחיר החדש
          ride: {
            ...match.ride,
            price: updatedPrice
          }
        };

        // עדכון status בהתאם להפרש המחיר
        // עבור בון תור וחורי: status יכול להיות 'matched' או 'price_difference'
        // עבור גט: status הוא תמיד 'matched', אבל יש priceDifference
        if (supplier === 'bontour' || supplier === 'hori') {
          if (hasPriceDifference) {
            updatedMatch.status = 'price_difference';
          } else {
            updatedMatch.status = 'matched';
          }
        } else if (supplier === 'gett') {
          // עבור גט, status נשאר 'matched' תמיד
          updatedMatch.status = 'matched';
        }

        return updatedMatch;
      });
    });

    return updatedResults;
  }, []);

  const handleUpdatePrice = useCallback((rideId, newPrice) => {
    if (!rideId || newPrice === null || newPrice === undefined) {
      return;
    }
    
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) {
      return;
    }
    
    // שמירת המחיר הישן לפני העדכון
    const oldPrice = updatedPrices.has(rideId) ? updatedPrices.get(rideId) : (parsedData.rides.find(r => r.rideId === rideId)?.price || 0);
    
    // עדכון updatedPrices
    setUpdatedPrices(prev => {
      const newMap = new Map(prev);
      if (price === 0) {
        // אם המחיר הוא 0, נסיר אותו מהמפה (נחזור למחיר המקורי)
        newMap.delete(rideId);
      } else {
        newMap.set(rideId, price);
      }
      return newMap;
    });
    
    // הוספת לוג
    const ride = parsedData.rides.find(r => r.rideId === rideId);
    if (ride) {
      // מציאת הספק מהנסיעה או מ-matchResults
      let supplier = ride.supplier || '';
      if (!supplier && matchResults) {
        // חיפוש ב-matchResults
        for (const [supplierKey, matches] of Object.entries(matchResults)) {
          const match = matches.find(m => m.ride && m.ride.rideId === rideId);
          if (match) {
            supplier = supplierKey;
            break;
          }
        }
      }
      
      // המרת שם הספק לעברית
      const supplierNames = {
        bontour: 'בון תור',
        hori: 'חורי',
        gett: 'גט'
      };
      const supplierName = supplierNames[supplier] || supplier;
      
      logActivity('price_updated', rideId, ride, { oldPrice, newPrice: price, supplier: supplierName });
      setActivityLogs(getAllActivities());
    }

    // עדכון matchResults עם המחיר החדש
    setMatchResults(prev => {
      if (!prev) return prev;
      
      // אם המחיר הוא 0, נחזור למחיר המקורי מהנסיעה
      let priceToUse = price;
      if (price === 0) {
        // חיפוש המחיר המקורי מהנסיעה
        const originalRide = parsedData.rides.find(r => r.rideId === rideId);
        if (originalRide && originalRide.price !== null && originalRide.price !== undefined) {
          priceToUse = originalRide.price;
        } else {
          // אם לא מצאנו מחיר מקורי, נשאיר 0
          priceToUse = 0;
        }
      }
      
      return updateMatchResultsForRide(prev, rideId, priceToUse);
    });
  }, [parsedData, updateMatchResultsForRide, matchResults, updatedPrices, setActivityLogs]);

  const handleAddToRide = useCallback((supplier, supplierData) => {
    const key = `${supplier}_${supplierData.orderNumber || supplierData.orderId || Date.now()}`;
    
    // יצירת אובייקט נסיעה חדש
    const newRide = {
      rideId: `MANUAL_${supplier}_${supplierData.orderNumber || supplierData.orderId || Date.now()}`,
      source: supplierData.source || '',
      destination: supplierData.destination || '',
      date: supplierData.date || '',
      price: supplierData.price || 0,
      passengers: supplierData.passengers || '',
      supplier: supplier,
      supplierOrderNumber: supplierData.orderNumber || supplierData.orderId || '',
      isManual: true,
      pids: [] // ננסה לחלץ PIDs מהנוסעים אם אפשר
    };

    // עדכון manuallyAddedRides
    setManuallyAddedRides(prev => {
      // בדיקה אם הנסיעה כבר נוספה
      if (prev.has(key)) {
        return prev;
      }
      const newMap = new Map(prev);
      newMap.set(key, newRide);
      return newMap;
    });

    // עדכון parsedData.rides
    setParsedData(prev => {
      // בדיקה אם הנסיעה כבר קיימת
      if (prev.rides.find(r => r.rideId === newRide.rideId)) {
        return prev;
      }
      return {
        ...prev,
        rides: [...prev.rides, newRide]
      };
    });

    // עדכון matchResults - יצירת התאמה חדשה והסרת התאמה ישנה
    setMatchResults(prev => {
      if (!prev) return prev;
      
      const updatedResults = { ...prev };
      const supplierKey = supplier;
      
      // בדיקה אם יש מערך התאמות עבור הספק
      if (!updatedResults[supplierKey] || !Array.isArray(updatedResults[supplierKey])) {
        updatedResults[supplierKey] = [];
      }
      
      const supplierMatches = [...updatedResults[supplierKey]];
      
      // חיפוש התאמה ישנה - כל התאמה שיש לה את אותו orderNumber מהספק
      const orderNumber = supplierData.orderNumber || supplierData.orderId;
      const oldMatchIndex = supplierMatches.findIndex(match => 
        match.supplierData &&
        (match.supplierData.orderNumber === orderNumber || match.supplierData.orderId === orderNumber)
      );
      
      // יצירת התאמה חדשה
      const newMatch = {
        supplier: supplierKey,
        supplierData: supplierData,
        ride: newRide,
        status: 'matched',
        priceDifference: 0, // אין הפרש מחיר כי המחיר של הספק הוא המחיר של הרייד
        matchConfidence: 1.0 // ביטחון מלא כי זה הוספה ידנית
      };
      
      // אם נמצאה התאמה ישנה, נחליף אותה
      if (oldMatchIndex !== -1) {
        supplierMatches[oldMatchIndex] = newMatch;
      } else {
        // אחרת, נוסיף התאמה חדשה
        supplierMatches.push(newMatch);
      }
      
      updatedResults[supplierKey] = supplierMatches;
      return updatedResults;
    });
    
    // הוספת לוג
    // המרת שם הספק לעברית
    const supplierNames = {
      bontour: 'בון תור',
      hori: 'חורי',
      gett: 'גט'
    };
    const supplierName = supplierNames[supplier] || supplier;
    logActivity('ride_added', newRide.rideId, newRide, { supplier: supplierName });
    setActivityLogs(getAllActivities());
  }, []);

  const handleUpdateNote = useCallback((rideId, note) => {
    setRideNotes(prev => {
      const newMap = new Map(prev);
      if (note && note.trim()) {
        // שמירת הערך המקורי כולל רווחים (לא trim)
        newMap.set(rideId, note);
      } else {
        newMap.delete(rideId);
      }
      return newMap;
    });
  }, []);

  const handleUpdatePassenger55555Department = useCallback((rideId, department) => {
    setPassenger55555Departments(prev => {
      const newMap = new Map(prev);
      if (department && department.trim() !== '') {
        newMap.set(rideId, department.trim());
      } else {
        newMap.delete(rideId);
      }
      return newMap;
    });
  }, []);

  const handleUpdatePassenger55555DepartmentsAndRecalculate = useCallback(() => {
    if (!parsedData.rides || parsedData.rides.length === 0) return;
    
    try {
      setIsAnalyzing(true);
      setError(null);
      
      // סינון נסיעות שהוסרו מהרייד לפני חישוב ההתפלגות המחלקתית
      const filteredRides = parsedData.rides.filter(ride => {
        if (!ride.rideId) return true;
        if (tripsRemovedFromReview && typeof tripsRemovedFromReview.has === 'function') {
          return !tripsRemovedFromReview.has(ride.rideId);
        }
        return true;
      });
      
      // חישוב מחדש של ההתפלגות המחלקתית עם השיוכים החדשים
      const deptData = calculateDepartmentBreakdown(filteredRides, parsedData.employeeMap, passenger55555Departments);
      setDepartmentData(deptData);
      
      // הוספת כל הנסיעות עם שיוך מחלקתי ל-tripsRemovedFromReview כדי שהן ייעלמו מהטבלה
      setTripsRemovedFromReview(prev => {
        const newSet = new Set(prev);
        passenger55555Departments.forEach((department, rideId) => {
          if (department && department.trim() !== '') {
            newSet.add(rideId);
          }
        });
        return newSet;
      });
      
    } catch (err) {
      handleError(err, 'עדכון נתונים', setError);
    } finally {
      setIsAnalyzing(false);
    }
  }, [parsedData, passenger55555Departments, tripsRemovedFromReview]);

  const handleManualGettMatch = useCallback((rideId, gettOrderNumber) => {
    // עדכון manualGettMatches
    setManualGettMatches(prev => {
      const newMap = new Map(prev);
      newMap.set(rideId, gettOrderNumber);
      return newMap;
    });
    
    // עדכון matchResults:
    // 1. מציאת ההתאמה של נסיעת הרייד (missing_in_supplier) והפיכתה ל-matched
    // 2. מציאת נסיעת הגט (missing_in_ride) והפיכתה ל-matched
    // 3. חישוב priceDifference
    setMatchResults(prev => {
      if (!prev || !prev.gett) return prev;
      
      const updatedResults = { ...prev };
      const gettMatches = [...prev.gett];
      
      // עדכון נסיעת הרייד (missing_in_supplier -> matched)
      const rideMatchIndex = gettMatches.findIndex(
        m => m.ride && m.ride.rideId === rideId && m.status === 'missing_in_supplier'
      );
      
      // עדכון נסיעת הגט (missing_in_ride -> matched)
      const gettMatchIndex = gettMatches.findIndex(
        m => m.supplierData && 
             (m.supplierData.orderNumber === gettOrderNumber || m.supplierData.orderId === gettOrderNumber) &&
             m.status === 'missing_in_ride'
      );
      
      if (rideMatchIndex !== -1 && gettMatchIndex !== -1) {
        const rideMatch = gettMatches[rideMatchIndex];
        const gettMatch = gettMatches[gettMatchIndex];
        
        // יצירת התאמה חדשה
        const newMatch = {
          supplier: 'gett',
          supplierData: gettMatch.supplierData,
          ride: rideMatch.ride,
          status: 'matched',
          priceDifference: Math.abs((rideMatch.ride.price || 0) - (gettMatch.supplierData.price || 0)),
          matchConfidence: 1.0
        };
        
        // החלפת שתי ההתאמות בהתאמה אחת
        gettMatches[rideMatchIndex] = newMatch;
        gettMatches.splice(gettMatchIndex, 1);
      }
      
      updatedResults.gett = gettMatches;
      return updatedResults;
    });
  }, []);

  const runAnalysis = useCallback(async () => {
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

    try {
      setIsAnalyzing(true);
      setError(null);

      const suppliersData = {
        bontour: parsedData.bontour,
        hori: parsedData.hori,
        gett: parsedData.gett
      };

      const matches = matchAllSuppliers(suppliersData, allRides, parsedData.employeeMap);
      setMatchResults(matches);

      // סינון נסיעות שהוסרו מהרייד לפני חישוב ההתפלגות המחלקתית
      const filteredRidesForDepartment = allRides.filter(ride => {
        if (!ride.rideId) return true;
        if (tripsRemovedFromReview && typeof tripsRemovedFromReview.has === 'function') {
          return !tripsRemovedFromReview.has(ride.rideId);
        }
        return true;
      });

      const deptData = calculateDepartmentBreakdown(filteredRidesForDepartment, parsedData.employeeMap, passenger55555Departments);
      setDepartmentData(deptData);

    } catch (err) {
      handleError(err, 'ביצוע ניתוח', setError);
    } finally {
      setIsAnalyzing(false);
    }
  }, [parsedData, manuallyAddedRides, updatedPrices, tripsRemovedFromReview]);

  const handleUpdateDepartmentData = useCallback((employeeDepartmentAssignments) => {
    if (!employeeDepartmentAssignments || employeeDepartmentAssignments.size === 0) {
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);

      // יצירת עותק של employeeMap לעדכון
      const updatedEmployeeMap = new Map(parsedData.employeeMap);
      
      // עדכון המחלקות של העובדים
      employeeDepartmentAssignments.forEach((department, key) => {
        if (!department) return;
        
        // key יכול להיות `${rideId}-${employeeId}` או `ride-${rideId}`
        if (key.startsWith('ride-')) {
          // זה שיוך של נסיעה כולה ללא PIDs - נצטרך למצוא את ה-PIDs מהנסיעה
          const rideId = parseInt(key.replace('ride-', ''));
          const ride = parsedData.rides.find(r => r.rideId === rideId);
          if (ride && ride.pids && ride.pids.length > 0) {
            // אם יש PIDs, נעדכן אותם
            ride.pids.forEach(pid => {
              const employee = updatedEmployeeMap.get(pid);
              if (employee) {
                updatedEmployeeMap.set(pid, { ...employee, department });
              }
            });
          }
        } else {
          // זה שיוך של עובד ספציפי
          // המפתח הוא `${rideId}-${employeeId}`
          const parts = key.split('-');
          if (parts.length >= 2) {
            const rideId = parseInt(parts[0]);
            const employeeId = parseInt(parts[parts.length - 1]);
            
            const employee = updatedEmployeeMap.get(employeeId);
            if (employee) {
              updatedEmployeeMap.set(employeeId, { ...employee, department });
            } else {
              // אם העובד לא קיים, ניצור אותו עם המידע הבסיסי
              const ride = parsedData.rides.find(r => r.rideId === rideId);
              if (ride) {
                updatedEmployeeMap.set(employeeId, {
                  employeeId: employeeId,
                  firstName: `PID ${employeeId}`,
                  lastName: '',
                  department: department
                });
              }
            }
          }
        }
      });

      // עדכון parsedData עם employeeMap המעודכן
      setParsedData(prev => ({
        ...prev,
        employeeMap: updatedEmployeeMap
      }));

      // סינון נסיעות שהוסרו מהרייד לפני חישוב ההתפלגות המחלקתית
      const filteredRides = parsedData.rides.filter(ride => {
        if (!ride.rideId) return true;
        if (tripsRemovedFromReview && typeof tripsRemovedFromReview.has === 'function') {
          return !tripsRemovedFromReview.has(ride.rideId);
        }
        return true;
      });

      // חישוב מחדש של ההתפלגות המחלקתית
      const deptData = calculateDepartmentBreakdown(filteredRides, updatedEmployeeMap, passenger55555Departments);
      setDepartmentData(deptData);

    } catch (err) {
      handleError(err, 'עדכון נתונים', setError);
    } finally {
      setIsAnalyzing(false);
    }
  }, [parsedData, tripsRemovedFromReview]);

  const handleExportDepartments = useCallback(async () => {
    if (!departmentData) {
      alert('אין נתוני חלוקה מחלקתית לייצוא');
      return;
    }

    try {
      const { exportDepartmentReports } = await loadExcelExporter();
      await exportDepartmentReports(departmentData.breakdown);
    } catch (err) {
      handleError(err, 'ייצוא דוחות מחלקתיים', setError);
    }
  }, [departmentData]);

  const handleExportAnalysis = useCallback(async () => {
    if (!matchResults) {
      alert('אין תוצאות ניתוח לייצוא');
      return;
    }

    try {
      const { exportAnalysisReport } = await loadExcelExporter();
      exportAnalysisReport(matchResults, rideNotes);
    } catch (err) {
      handleError(err, 'ייצוא דוח ניתוח', setError);
    }
  }, [matchResults, rideNotes]);


  return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <motion.header 
            className="mb-10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 via-purple-600 to-primary-600 bg-clip-text text-transparent mb-3">
                  דשבורד ניתוח נסיעות ספקים
                </h1>
                <p className="text-lg text-gray-600 font-medium">
                  מערכת לניתוח והשוואת קבצי ספקים עם רייד
                </p>
              </div>
            </div>
          </motion.header>

          <AnimatePresence>
            {error && (
              <motion.div 
                className="mb-6 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 text-red-800 px-6 py-4 rounded-xl shadow-soft"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-semibold">{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* כפתורי פעולה */}
          <motion.div 
            className="mb-8 flex gap-4 flex-wrap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.button
              onClick={loadDemoData}
              className="btn-modern bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl"
              disabled={isAnalyzing}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FileText className="w-4 h-4 inline-block ml-2" />
              טען נתוני דמו
            </motion.button>
            
            <motion.button
              onClick={clearData}
              className="btn-modern bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg hover:shadow-xl"
              disabled={isAnalyzing}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Trash2 className="w-4 h-4 inline-block ml-2" />
              נקה נתונים
            </motion.button>
            
            <motion.button
              onClick={runAnalysis}
              className="btn-modern bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isAnalyzing || parsedData.rides.length === 0}
              whileHover={{ scale: parsedData.rides.length > 0 ? 1.05 : 1 }}
              whileTap={{ scale: parsedData.rides.length > 0 ? 0.95 : 1 }}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 inline-block ml-2 animate-spin" />
                  מנתח...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 inline-block ml-2" />
                  נתח
                </>
              )}
            </motion.button>
            
            {matchResults && (
              <motion.button
                onClick={handleExportAnalysis}
                className="btn-modern bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg hover:shadow-xl"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Download className="w-4 h-4 inline-block ml-2" />
                ייצא דוח התאמות
              </motion.button>
            )}
            
            {departmentData && (
              <motion.button
                onClick={handleExportDepartments}
                className="btn-modern bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg hover:shadow-xl"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <BarChart3 className="w-4 h-4 inline-block ml-2" />
                ייצא דוחות Excel למחלקות
              </motion.button>
            )}
          </motion.div>

          {/* העלאת קבצים */}
          <motion.div 
            className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <FileUpload
              fileType="ride"
              label="קובץ רייד (CSV)"
              onFileUpload={handleFileUpload}
              currentFile={files.ride}
              itemCount={parsedData && parsedData.rides ? parsedData.rides.length : 0}
            />
            <FileUpload
              fileType="bontour"
              label="בון תור (Excel)"
              onFileUpload={handleFileUpload}
              currentFile={files.bontour}
              itemCount={parsedData && parsedData.bontour ? parsedData.bontour.length : 0}
            />
            <FileUpload
              fileType="hori"
              label="חורי (Excel)"
              onFileUpload={handleFileUpload}
              currentFile={files.hori}
              itemCount={parsedData && parsedData.hori ? parsedData.hori.length : 0}
            />
            <FileUpload
              fileType="gett"
              label="גט (Excel)"
              onFileUpload={handleFileUpload}
              currentFile={files.gett}
              itemCount={parsedData && parsedData.gett ? parsedData.gett.length : 0}
            />
            <FileUpload
              fileType="employees"
              label="מסד עובדים (CSV)"
              onFileUpload={handleFileUpload}
              currentFile={files.employees}
            />
          </motion.div>

          {/* סטטוס טעינה */}
          <AnimatePresence>
            {isAnalyzing && (
              <motion.div 
                className="mb-8 text-center py-12"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <motion.div
                  className="inline-block"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="w-12 h-12 text-primary-600" />
                </motion.div>
                <p className="mt-4 text-gray-700 font-semibold text-lg">מעבד נתונים...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* סיכום נתונים - קונטיינר מעוגל בצד שמאל */}
          {(matchResults || departmentData) && parsedData.rides.length > 0 && (() => {
            // סיכום נתונים - מציג את כל הנסיעות (לא מסנן נסיעות שהוסרו)
            // נסיעות שהוסרו יופיעו בחלוקה המחלקתית אבל לא ייספרו בסיכום הכללי
            const totalRides = parsedData.rides.length;
            const totalAmount = parsedData.rides.reduce((sum, ride) => {
              const price = updatedPrices.has(ride.rideId) 
                ? updatedPrices.get(ride.rideId) 
                : (ride.price || 0);
              return sum + price;
            }, 0);
            
            return (
              <motion.div
                className="mb-8 flex justify-start"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl shadow-lg p-6 min-w-[300px]">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 text-right">סיכום נתונים</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">מספר נסיעות:</div>
                      <div className="text-2xl font-bold text-blue-700">
                        {totalRides.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">סכום כולל:</div>
                      <div className="text-2xl font-bold text-indigo-700">
                        ₪{totalAmount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {/* נסיעות לבדיקה - נסיעות עם מחיר אפס */}
          {(matchResults || departmentData) && parsedData.rides.length > 0 && (
            <motion.div 
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Suspense fallback={
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
                  <p className="mt-2 text-gray-600">טוען נסיעות לבדיקה...</p>
                </div>
              }>
                <ZeroPriceRides 
                  rides={parsedData.rides} 
                  employeeMap={parsedData.employeeMap}
                  onUpdatePrice={handleUpdatePrice}
                  updatedPrices={updatedPrices}
                  passenger55555Departments={passenger55555Departments}
                  onUpdatePassenger55555Department={handleUpdatePassenger55555Department}
                  onUpdateDepartmentsAndRecalculate={handleUpdatePassenger55555DepartmentsAndRecalculate}
                  tripsRemovedFromReview={tripsRemovedFromReview}
                  guestRidesRemoved={guestRidesRemoved}
                  onRemoveGuestRide={setGuestRidesRemoved}
                  activityLogs={activityLogs}
                  setActivityLogs={setActivityLogs}
                />
              </Suspense>
            </motion.div>
          )}

          {/* תוצאות ניתוח */}
          {matchResults && (
            <motion.div 
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Suspense fallback={
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
                  <p className="mt-2 text-gray-600">טוען תוצאות...</p>
                </div>
              }>
                <AnalysisResults 
                  matchResults={matchResults} 
                  employeeMap={parsedData.employeeMap}
                  rides={[...parsedData.rides, ...Array.from(manuallyAddedRides.values())]}
                  onAddToRide={handleAddToRide}
                  manuallyAddedRides={manuallyAddedRides}
                  onManualGettMatch={handleManualGettMatch}
                  manualGettMatches={manualGettMatches}
                  rideNotes={rideNotes}
                  onUpdateNote={handleUpdateNote}
                  tripsForReviewByRide={tripsForReviewByRide}
                  onUpdateTripsForReview={setTripsForReviewByRide}
                  tripsRemovedFromReview={tripsRemovedFromReview}
                  onUpdateTripsRemovedFromReview={setTripsRemovedFromReview}
                  updatedPrices={updatedPrices}
                  onUpdatePrice={handleUpdatePrice}
                  activityLogs={activityLogs}
                  setActivityLogs={setActivityLogs}
                />
              </Suspense>
            </motion.div>
          )}

          {/* חלוקה מחלקתית */}
          {departmentData && (
            <motion.div 
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Suspense fallback={
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
                  <p className="mt-2 text-gray-600">טוען חלוקה מחלקתית...</p>
                </div>
              }>
                <DepartmentBreakdown 
                  departmentData={departmentData} 
                  employeeMap={parsedData.employeeMap}
                  onUpdateDepartmentData={handleUpdateDepartmentData}
                  tripsRemovedFromReview={tripsRemovedFromReview}
                  onUpdateTripsRemovedFromReview={setTripsRemovedFromReview}
                  activityLogs={activityLogs}
                  setActivityLogs={setActivityLogs}
                />
              </Suspense>
            </motion.div>
          )}

          {/* כפתור צף ללוג */}
          <motion.button
            onClick={() => setShowActivityLogModal(true)}
            className="fixed bottom-4 right-4 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-50 transition-colors"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="לוג פעולות"
          >
            <List className="w-6 h-6" />
          </motion.button>

          {/* מודל לוג פעולות */}
          <ActivityLogModal
            isOpen={showActivityLogModal}
            onClose={() => setShowActivityLogModal(false)}
            activityLogs={activityLogs}
          />
      </div>
    </div>
  );
}

export default App;
