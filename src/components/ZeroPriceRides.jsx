// React
import { memo, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

// Framer Motion
import { motion, AnimatePresence } from 'framer-motion';

// Icons
import { AlertTriangle, Edit2, Check, X, RefreshCw, Trash2, Download } from 'lucide-react';

/**
 * קומפוננטה להצגת נסיעות לבדיקה (מחיר אפס או נוסע 55555)
 * @param {Object} props - Props של הקומפוננטה
 * @param {Array} props.rides - מערך של נסיעות
 * @param {Map} props.employeeMap - מפה של עובדים
 * @param {Function} props.onUpdatePrice - פונקציה לעדכון מחיר
 * @param {Map} props.updatedPrices - מפה של מחירים מעודכנים
 */
const ZeroPriceRides = memo(function ZeroPriceRides({ 
  rides, 
  employeeMap, 
  onUpdatePrice, 
  updatedPrices = new Map(),
  passenger55555Departments = new Map(),
  onUpdatePassenger55555Department,
  onUpdateDepartmentsAndRecalculate,
  tripsRemovedFromReview = new Set(),
  guestRidesRemoved = new Set(),
  onRemoveGuestRide
}) {
  const [activeTab, setActiveTab] = useState('zeroPrice');
  const [editingRideId, setEditingRideId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [delayedSupplierFilter, setDelayedSupplierFilter] = useState('all');

  // סינון נסיעות עם מחיר אפס (כולל נסיעות עם מחיר מעודכן של 0)
  // לא נכלול נסיעות שהוסרו מהרייד (tripsRemovedFromReview)
  const zeroPriceRides = useMemo(() => {
    return rides.filter(ride => {
      // בדיקה אם הנסיעה הוסרה מהרייד
      const isRemoved = ride.rideId && tripsRemovedFromReview && typeof tripsRemovedFromReview.has === 'function' && tripsRemovedFromReview.has(ride.rideId);
      // אם הנסיעה הוסרה, לא נכלול אותה
      if (isRemoved) {
        return false;
      }
      const price = updatedPrices.has(ride.rideId) 
        ? updatedPrices.get(ride.rideId) 
        : (ride.price || 0);
      return !price || price === 0;
    });
  }, [rides, updatedPrices, tripsRemovedFromReview]);

  // איסוף כל הספקים הייחודיים מנסיעות אפס
  const uniqueSuppliers = useMemo(() => {
    const suppliers = new Set();
    zeroPriceRides.forEach(ride => {
      if (ride.supplier && ride.supplier.trim() !== '') {
        suppliers.add(ride.supplier);
      }
    });
    return Array.from(suppliers).sort();
  }, [zeroPriceRides]);

  // סינון נסיעות אפס לפי ספק
  const filteredZeroPriceRides = useMemo(() => {
    if (supplierFilter === 'all') {
      return zeroPriceRides;
    }
    return zeroPriceRides.filter(ride => ride.supplier === supplierFilter);
  }, [zeroPriceRides, supplierFilter]);

  // סינון נסיעות עם נוסע 55555 (לא כולל נסיעות שהוסרו מהרייד)
  const ridesWith55555 = useMemo(() => {
    return rides.filter(ride => {
      // בדיקה אם הנסיעה הוסרה מהרייד
      const isRemoved = ride.rideId && tripsRemovedFromReview && typeof tripsRemovedFromReview.has === 'function' && tripsRemovedFromReview.has(ride.rideId);
      if (isRemoved) {
        return false;
      }
      
      // בדיקה ב-PIDs
      if (ride.pids && ride.pids.includes(55555)) {
        return true;
      }
      // בדיקה בשדה נוסעים (מחרוזת)
      if (ride.passengers) {
        const passengersStr = String(ride.passengers);
        // חיפוש המספר 55555 במחרוזת
        if (passengersStr.includes('55555')) {
          return true;
        }
      }
      return false;
    });
  }, [rides, tripsRemovedFromReview]);

  // סינון נסיעות ללא נוסעים
  const ridesWithoutPassengers = useMemo(() => {
    return rides.filter(ride => {
      // בדיקה אם אין PIDs או שהמערך ריק
      const hasPids = ride.pids && Array.isArray(ride.pids) && ride.pids.length > 0;
      // בדיקה אם אין נוסעים בשדה נוסעים
      const hasPassengers = ride.passengers && String(ride.passengers).trim() !== '';
      // נסיעה ללא נוסעים = אין PIDs ואין נוסעים
      return !hasPids && !hasPassengers;
    });
  }, [rides]);

  // סינון נסיעות אורח (קוד נוסע 12548 או "אורח אורח")
  const guestRides = useMemo(() => {
    return rides.filter(ride => {
      // בדיקה אם הנסיעה הוסרה מהרייד
      const isRemoved = ride.rideId && tripsRemovedFromReview && typeof tripsRemovedFromReview.has === 'function' && tripsRemovedFromReview.has(ride.rideId);
      if (isRemoved) {
        return false;
      }
      
      // בדיקה אם הנסיעה הוסרה מרשימת נסיעות אורח
      const isGuestRemoved = ride.rideId && guestRidesRemoved && typeof guestRidesRemoved.has === 'function' && guestRidesRemoved.has(ride.rideId);
      if (isGuestRemoved) {
        return false;
      }
      
      // בדיקה ב-PIDs
      if (ride.pids && ride.pids.includes(12548)) {
        return true;
      }
      // בדיקה בשדה נוסעים (מחרוזת) - חיפוש "אורח אורח" או "12548"
      if (ride.passengers) {
        const passengersStr = String(ride.passengers);
        // חיפוש "אורח אורח" או "12548" במחרוזת
        if (passengersStr.includes('אורח אורח') || passengersStr.includes('12548')) {
          return true;
        }
      }
      return false;
    });
  }, [rides, tripsRemovedFromReview, guestRidesRemoved]);

  // סינון נסיעות חריג (נסיעות שבהן יש את המילה "חריג" בשדה נוסעים)
  const exceptionalRides = useMemo(() => {
    return rides.filter(ride => {
      // בדיקה אם הנסיעה הוסרה מהרייד
      const isRemoved = ride.rideId && tripsRemovedFromReview && typeof tripsRemovedFromReview.has === 'function' && tripsRemovedFromReview.has(ride.rideId);
      if (isRemoved) {
        return false;
      }
      
      // בדיקה בשדה נוסעים (מחרוזת) - חיפוש המילה "חריג"
      if (ride.passengers) {
        const passengersStr = String(ride.passengers);
        // חיפוש המילה "חריג" במחרוזת
        if (passengersStr.includes('חריג')) {
          return true;
        }
      }
      return false;
    });
  }, [rides, tripsRemovedFromReview]);

  // סינון נסיעות איחורים (נסיעות שבהן יש את המילה "איחור" בשדה הערות)
  const delayedRides = useMemo(() => {
    return rides.filter(ride => {
      // בדיקה אם הנסיעה הוסרה מהרייד
      const isRemoved = ride.rideId && tripsRemovedFromReview && typeof tripsRemovedFromReview.has === 'function' && tripsRemovedFromReview.has(ride.rideId);
      if (isRemoved) {
        return false;
      }
      
      // בדיקה בשדה הערות - חיפוש המילה "איחור"
      if (ride.notes) {
        const notesStr = String(ride.notes);
        // חיפוש המילה "איחור" במחרוזת
        if (notesStr.includes('איחור')) {
          return true;
        }
      }
      return false;
    });
  }, [rides, tripsRemovedFromReview]);

  // איסוף כל הספקים הייחודיים מנסיעות איחורים
  const delayedRidesSuppliers = useMemo(() => {
    const suppliers = new Set();
    delayedRides.forEach(ride => {
      if (ride.supplier && ride.supplier.trim() !== '') {
        suppliers.add(ride.supplier);
      }
    });
    return Array.from(suppliers).sort();
  }, [delayedRides]);

  // סינון נסיעות איחורים לפי ספק
  const filteredDelayedRides = useMemo(() => {
    if (delayedSupplierFilter === 'all') {
      return delayedRides;
    }
    return delayedRides.filter(ride => ride.supplier === delayedSupplierFilter);
  }, [delayedRides, delayedSupplierFilter]);

  // חילוץ רשימת מחלקות מה-employeeMap
  const availableDepartments = useMemo(() => {
    if (!employeeMap) return [];
    const departments = new Set();
    employeeMap.forEach(employee => {
      if (employee.department && employee.department.trim() !== '') {
        departments.add(employee.department.trim());
      }
    });
    return Array.from(departments).sort();
  }, [employeeMap]);

  // אם אין נסיעות בכלל, לא נציג כלום
  if (zeroPriceRides.length === 0 && ridesWith55555.length === 0 && ridesWithoutPassengers.length === 0 && guestRides.length === 0 && exceptionalRides.length === 0 && delayedRides.length === 0) {
    return null;
  }

  // פונקציה לפרסור תאריך
  const parseDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // פונקציה לפרסור תאריך ושעה
  const parseDateAndTime = (dateStr, timeStr) => {
    let datePart = dateStr || '';
    let timePart = timeStr || '';
    
    // אם התאריך כולל זמן (מכיל : או space עם מספרים)
    if (dateStr && (dateStr.includes(':') || dateStr.includes(' '))) {
      const parts = dateStr.split(/[\sT]/);
      if (parts.length > 1) {
        datePart = parts[0];
        timePart = parts[1] || '';
      }
    }
    
    if (!datePart) return '-';
    
    try {
      // ניסיון לפרסר את התאריך
      let date;
      if (datePart.includes('/')) {
        const [day, month, year] = datePart.split('/').map(Number);
        if (timePart) {
          const [hours, minutes] = timePart.split(':').map(Number);
          date = new Date(year, month - 1, day, hours || 0, minutes || 0);
        } else {
          date = new Date(year, month - 1, day);
        }
      } else {
        date = new Date(datePart + (timePart ? ' ' + timePart : ''));
      }
      
      if (isNaN(date.getTime())) {
        return datePart + (timePart ? ' ' + timePart : '');
      }
      
      const dateFormatted = date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      
      if (timePart) {
        const timeFormatted = date.toLocaleTimeString('he-IL', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        return `${dateFormatted} ${timeFormatted}`;
      }
      
      return dateFormatted;
    } catch {
      return datePart + (timePart ? ' ' + timePart : '');
    }
  };

  // פונקציה לקבלת שמות עובדים
  const getEmployeeNames = (pids) => {
    if (!pids || pids.length === 0) return '-';
    return pids.map(pid => {
      const employee = employeeMap?.get(pid);
      if (employee) {
        return `${employee.firstName} ${employee.lastName}`.trim();
      }
      return `PID: ${pid}`;
    }).join(', ');
  };

  // פונקציה לחילוץ רק נוסעים עם "חריג" מהמחרוזת
  const extractExceptionalPassengers = (passengersStr) => {
    if (!passengersStr || passengersStr === '-') return '-';
    
    const str = String(passengersStr).trim();
    if (!str) return '-';
    
    // פיצול לפי נקודה-פסיק (עם או בלי רווח אחרי)
    const parts = str.split(/[;]\s*/).map(part => part.trim()).filter(part => part !== '');
    
    // אם אין חלקים, נחזיר את המחרוזת המקורית
    if (parts.length === 0) {
      return str;
    }
    
    // חיפוש חלקים שמכילים "חריג"
    const exceptionalParts = parts.filter(part => part.includes('חריג'));
    
    if (exceptionalParts.length === 0) {
      // אם לא נמצא "חריג" בכל החלקים, נחזיר את המחרוזת המקורית
      return str;
    }
    
    // החזרת רק החלקים עם "חריג" מחוברים בנקודה-פסיק
    return exceptionalParts.join('; ');
  };

  // בחירת הנסיעות לפי הטאב הפעיל
  const currentRides = useMemo(() => {
    if (activeTab === 'zeroPrice') return filteredZeroPriceRides;
    if (activeTab === 'passenger55555') return ridesWith55555;
    if (activeTab === 'noPassengers') return ridesWithoutPassengers;
    if (activeTab === 'guest') return guestRides;
    if (activeTab === 'exceptional') return exceptionalRides;
    if (activeTab === 'delayed') return filteredDelayedRides;
    return [];
  }, [activeTab, filteredZeroPriceRides, ridesWith55555, ridesWithoutPassengers, guestRides, exceptionalRides, filteredDelayedRides]);
  
  const currentCount = useMemo(() => {
    if (activeTab === 'zeroPrice') return filteredZeroPriceRides.length;
    if (activeTab === 'passenger55555') return ridesWith55555.length;
    if (activeTab === 'noPassengers') return ridesWithoutPassengers.length;
    if (activeTab === 'guest') return guestRides.length;
    if (activeTab === 'exceptional') return exceptionalRides.length;
    if (activeTab === 'delayed') return filteredDelayedRides.length;
    return 0;
  }, [activeTab, filteredZeroPriceRides.length, ridesWith55555.length, ridesWithoutPassengers.length, guestRides.length, exceptionalRides.length, filteredDelayedRides.length]);

  // פונקציה לקבלת מחיר מעודכן או מקורי
  const getPrice = (ride) => {
    if (updatedPrices.has(ride.rideId)) {
      return updatedPrices.get(ride.rideId);
    }
    return ride.price || 0;
  };

  // פונקציה לפתיחת עריכה ישירה
  const handleEditClick = (ride) => {
    const currentPrice = getPrice(ride);
    setEditPrice(currentPrice.toString());
    setEditingRideId(ride.rideId);
  };

  // פונקציה לשמירת מחיר (עריכה ישירה)
  const handleSavePrice = (rideId) => {
    if (!rideId || !onUpdatePrice) return;
    
    const price = parseFloat(editPrice);
    if (isNaN(price) || price < 0) {
      alert('אנא הזן מחיר תקין (מספר חיובי)');
      setEditingRideId(null);
      setEditPrice('');
      return;
    }
    
    onUpdatePrice(rideId, price);
    setEditingRideId(null);
    setEditPrice('');
  };

  // פונקציה לביטול עריכה
  const handleCancelEdit = () => {
    setEditingRideId(null);
    setEditPrice('');
  };

  // פונקציה לטיפול ב-Escape בשדה עריכה
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // פונקציה להסרת נסיעת אורח מהרשימה
  const handleRemoveGuestRide = (rideId) => {
    if (!onRemoveGuestRide || !rideId) return;
    
    onRemoveGuestRide(prev => {
      const newSet = new Set(prev);
      newSet.add(rideId);
      return newSet;
    });
  };

  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl shadow-lg overflow-hidden">
        {/* כותרת */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-5 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-900" />
          <h2 className="text-2xl font-bold text-yellow-900">
            נסיעות לבדיקה
          </h2>
          <span className="mr-auto text-sm font-semibold text-yellow-800 bg-yellow-200 px-3 py-1 rounded-full">
            {currentCount} נסיעות
          </span>
        </div>

        {/* טאבים */}
        <div className="border-b border-yellow-300 bg-yellow-100/50">
          <div className="flex gap-2 p-2">
            <button
              onClick={() => setActiveTab('zeroPrice')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === 'zeroPrice'
                  ? 'bg-yellow-500 text-yellow-900 shadow-md'
                  : 'bg-yellow-200/50 text-yellow-800 hover:bg-yellow-300/50'
              }`}
            >
              נסיעות אפס ({zeroPriceRides.length})
            </button>
            <button
              onClick={() => setActiveTab('passenger55555')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === 'passenger55555'
                  ? 'bg-yellow-500 text-yellow-900 shadow-md'
                  : 'bg-yellow-200/50 text-yellow-800 hover:bg-yellow-300/50'
              }`}
            >
              נוסע 55555 ({ridesWith55555.length})
            </button>
            <button
              onClick={() => setActiveTab('noPassengers')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === 'noPassengers'
                  ? 'bg-yellow-500 text-yellow-900 shadow-md'
                  : 'bg-yellow-200/50 text-yellow-800 hover:bg-yellow-300/50'
              }`}
            >
              נסיעות ללא נוסעים ({ridesWithoutPassengers.length})
            </button>
            <button
              onClick={() => setActiveTab('guest')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === 'guest'
                  ? 'bg-yellow-500 text-yellow-900 shadow-md'
                  : 'bg-yellow-200/50 text-yellow-800 hover:bg-yellow-300/50'
              }`}
            >
              נסיעות אורח ({guestRides.length})
            </button>
            <button
              onClick={() => setActiveTab('exceptional')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === 'exceptional'
                  ? 'bg-yellow-500 text-yellow-900 shadow-md'
                  : 'bg-yellow-200/50 text-yellow-800 hover:bg-yellow-300/50'
              }`}
            >
              נסיעות חריג ({exceptionalRides.length})
            </button>
            <button
              onClick={() => setActiveTab('delayed')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === 'delayed'
                  ? 'bg-yellow-500 text-yellow-900 shadow-md'
                  : 'bg-yellow-200/50 text-yellow-800 hover:bg-yellow-300/50'
              }`}
            >
              איחורים ({delayedRides.length})
            </button>
          </div>
        </div>

        {/* בורר סינון לפי ספק - רק לנסיעות אפס */}
        {activeTab === 'zeroPrice' && uniqueSuppliers.length > 0 && (
          <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                סינון לפי ספק:
              </label>
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="border-2 border-yellow-300 rounded-lg px-4 py-2 text-sm font-medium bg-white hover:border-yellow-400 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-200 transition-all duration-200 min-w-[150px]"
              >
                <option value="all">הכל</option>
                {uniqueSuppliers.map(supplier => (
                  <option key={supplier} value={supplier}>
                    {supplier}
                  </option>
                ))}
              </select>
              {supplierFilter !== 'all' && (
                <span className="text-xs text-gray-600">
                  ({filteredZeroPriceRides.length} מתוך {zeroPriceRides.length})
                </span>
              )}
            </div>
          </div>
        )}

        {/* בורר סינון לפי ספק - רק לאיחורים */}
        {activeTab === 'delayed' && delayedRidesSuppliers.length > 0 && (
          <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                סינון לפי ספק:
              </label>
              <select
                value={delayedSupplierFilter}
                onChange={(e) => setDelayedSupplierFilter(e.target.value)}
                className="border-2 border-yellow-300 rounded-lg px-4 py-2 text-sm font-medium bg-white hover:border-yellow-400 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-200 transition-all duration-200 min-w-[150px]"
              >
                <option value="all">הכל</option>
                {delayedRidesSuppliers.map(supplier => (
                  <option key={supplier} value={supplier}>
                    {supplier}
                  </option>
                ))}
              </select>
              {delayedSupplierFilter !== 'all' && (
                <span className="text-xs text-gray-600">
                  ({filteredDelayedRides.length} מתוך {delayedRides.length})
                </span>
              )}
            </div>
          </div>
        )}

        {/* כפתור ייצוא נסיעות - רק לנסיעות חריג */}
        {activeTab === 'exceptional' && exceptionalRides.length > 0 && (
          <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-center gap-3">
              <motion.button
                onClick={() => {
                  // טעינה דינמית של excelExporter
                  import('../utils/excelExporter').then(({ exportExceptionalRides }) => {
                    exportExceptionalRides(exceptionalRides);
                  }).catch(err => {
                    console.error('שגיאה בייצוא נסיעות חריג:', err);
                    alert('שגיאה בייצוא נסיעות חריג');
                  });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Download className="w-4 h-4" />
                ייצא נסיעות
              </motion.button>
              <span className="text-xs text-gray-600">
                ({exceptionalRides.length} נסיעות)
              </span>
            </div>
          </div>
        )}

        {/* כפתור ייצוא נסיעות - רק לנסיעות אורח */}
        {activeTab === 'guest' && guestRides.length > 0 && (
          <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-center gap-3">
              <motion.button
                onClick={() => {
                  // טעינה דינמית של excelExporter
                  import('../utils/excelExporter').then(({ exportGuestRides }) => {
                    exportGuestRides(guestRides);
                  }).catch(err => {
                    console.error('שגיאה בייצוא נסיעות אורח:', err);
                    alert('שגיאה בייצוא נסיעות אורח');
                  });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Download className="w-4 h-4" />
                ייצא נסיעות
              </motion.button>
              <span className="text-xs text-gray-600">
                ({guestRides.length} נסיעות)
              </span>
            </div>
          </div>
        )}

        {/* כפתור עדכן נתונים - רק לנוסע 55555 */}
        {activeTab === 'passenger55555' && ridesWith55555.length > 0 && (
          <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-center gap-3">
              <motion.button
                onClick={() => {
                  if (onUpdateDepartmentsAndRecalculate) {
                    onUpdateDepartmentsAndRecalculate();
                  }
                }}
                disabled={!passenger55555Departments || passenger55555Departments.size === 0}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors shadow-md ${
                  passenger55555Departments && passenger55555Departments.size > 0
                    ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-60'
                }`}
                whileHover={passenger55555Departments && passenger55555Departments.size > 0 ? { scale: 1.05 } : {}}
                whileTap={passenger55555Departments && passenger55555Departments.size > 0 ? { scale: 0.95 } : {}}
              >
                <RefreshCw className="w-4 h-4" />
                עדכן נתונים
              </motion.button>
              {passenger55555Departments && passenger55555Departments.size > 0 ? (
                <span className="text-xs text-gray-600">
                  ({passenger55555Departments.size} נסיעות עם שיוך מחלקתי)
                </span>
              ) : (
                <span className="text-xs text-gray-500">
                  בחר מחלקה לנסיעות כדי לעדכן
                </span>
              )}
            </div>
          </div>
        )}

        {/* טבלה */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-yellow-100 to-orange-100">
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-800 border-b-2 border-yellow-300">
                  מספר נסיעה
                </th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-800 border-b-2 border-yellow-300">
                  {activeTab === 'noPassengers' ? 'תאריך ושעה' : 'תאריך'}
                </th>
                {activeTab !== 'noPassengers' && (
                  <>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-800 border-b-2 border-yellow-300">
                      מוצא
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-800 border-b-2 border-yellow-300">
                      יעד
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-800 border-b-2 border-yellow-300">
                      נוסעים
                    </th>
                  </>
                )}
                {activeTab === 'noPassengers' && (
                  <>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-800 border-b-2 border-yellow-300">
                      מקור
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-800 border-b-2 border-yellow-300">
                      יעד
                    </th>
                  </>
                )}
                {activeTab === 'passenger55555' && (
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-800 border-b-2 border-yellow-300">
                    שייך למחלקה
                  </th>
                )}
                {activeTab !== 'noPassengers' && (
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-800 border-b-2 border-yellow-300">
                    ספק
                  </th>
                )}
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-800 border-b-2 border-yellow-300">
                  מחיר
                </th>
                {activeTab === 'delayed' && (
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-800 border-b-2 border-yellow-300">
                    הערות
                  </th>
                )}
                {activeTab === 'guest' && (
                  <>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-800 border-b-2 border-yellow-300">
                      הערות
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-800 border-b-2 border-yellow-300">
                      פעולות
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {currentRides.length === 0 ? (
                <tr>
                  <td colSpan={
                    activeTab === 'passenger55555' ? 8 : 
                    activeTab === 'noPassengers' ? 5 : 
                    activeTab === 'guest' ? 9 :
                    activeTab === 'exceptional' ? 7 :
                    activeTab === 'delayed' ? 8 :
                    7
                  } className="px-6 py-8 text-center text-gray-500">
                    אין נסיעות בקטגוריה זו
                  </td>
                </tr>
              ) : (
                currentRides.map((ride, index) => {
                  const displayPrice = getPrice(ride);
                  const hasUpdatedPrice = updatedPrices.has(ride.rideId);
                  
                  return (
                    <motion.tr
                      key={ride.rideId || index}
                      className={`border-b border-yellow-200 hover:bg-yellow-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-yellow-50/50'
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                        {ride.rideId || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {activeTab === 'noPassengers' 
                          ? parseDateAndTime(ride.date, ride.time) 
                          : parseDate(ride.date)}
                      </td>
                      {activeTab !== 'noPassengers' && (
                        <>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {ride.source || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {ride.destination || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {activeTab === 'exceptional' 
                              ? extractExceptionalPassengers(ride.passengers || getEmployeeNames(ride.pids) || '')
                              : (ride.passengers || getEmployeeNames(ride.pids) || '-')}
                          </td>
                        </>
                      )}
                      {activeTab === 'noPassengers' && (
                        <>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {ride.source || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {ride.destination || '-'}
                          </td>
                        </>
                      )}
                      {activeTab === 'passenger55555' && (
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <select
                            value={passenger55555Departments?.get(ride.rideId) || ''}
                            onChange={(e) => {
                              if (onUpdatePassenger55555Department) {
                                onUpdatePassenger55555Department(ride.rideId, e.target.value);
                              }
                            }}
                            className="w-full px-3 py-2 border-2 border-yellow-300 rounded-lg text-sm focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-200 bg-white"
                          >
                            <option value="">-- בחר מחלקה --</option>
                            {availableDepartments.map(dept => (
                              <option key={dept} value={dept}>
                                {dept}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                      {activeTab !== 'noPassengers' && (
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {ride.supplier || '-'}
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm font-bold">
                        {activeTab === 'zeroPrice' && editingRideId === ride.rideId ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              onKeyDown={handleKeyDown}
                              className="w-24 px-2 py-1 border-2 border-primary-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                              autoFocus
                            />
                            <motion.button
                              onClick={() => handleSavePrice(ride.rideId)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 transition-colors"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              title="שמור מחיר"
                            >
                              <Check className="w-3 h-3" />
                              שמור
                            </motion.button>
                            <motion.button
                              onClick={handleCancelEdit}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-500 text-white text-xs font-semibold rounded hover:bg-gray-600 transition-colors"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              title="ביטול"
                            >
                              <X className="w-3 h-3" />
                              ביטול
                            </motion.button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span 
                              className={`${hasUpdatedPrice ? 'text-green-600' : 'text-red-600'} cursor-pointer hover:underline`}
                              onClick={() => activeTab === 'zeroPrice' && handleEditClick(ride)}
                              title={activeTab === 'zeroPrice' ? 'לחץ לעריכה' : ''}
                            >
                              ₪{displayPrice.toFixed(2)}
                            </span>
                            {hasUpdatedPrice && (
                              <span className="text-xs text-green-600 font-semibold">(מעודכן)</span>
                            )}
                            {activeTab === 'zeroPrice' && !hasUpdatedPrice && (
                              <motion.button
                                onClick={() => handleEditClick(ride)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-primary-600 text-white text-xs font-semibold rounded hover:bg-primary-700 transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                title="ערוך מחיר"
                              >
                                <Edit2 className="w-3 h-3" />
                              </motion.button>
                            )}
                          </div>
                        )}
                      </td>
                      {activeTab === 'delayed' && (
                        <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                          <div className="text-right break-words whitespace-pre-line" title={ride.notes || ''}>
                            {ride.notes ? ride.notes.replace(/<br\s*\/?>/gi, '\n') : '-'}
                          </div>
                        </td>
                      )}
                      {activeTab === 'guest' && (
                        <>
                          <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                            <div className="text-right break-words whitespace-pre-line" title={ride.notes || ''}>
                              {ride.notes ? ride.notes.replace(/<br\s*\/?>/gi, '\n') : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            <motion.button
                              onClick={() => handleRemoveGuestRide(ride.rideId)}
                              className="inline-flex items-center gap-2 px-3 py-2 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors shadow-md"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              title="הסר מרשימה"
                            >
                              <Trash2 className="w-3 h-3" />
                              הסר מרשימה
                            </motion.button>
                          </td>
                        </>
                      )}
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </motion.div>
  );
});

ZeroPriceRides.propTypes = {
  rides: PropTypes.arrayOf(PropTypes.object).isRequired,
  employeeMap: PropTypes.instanceOf(Map),
  onUpdatePrice: PropTypes.func,
  updatedPrices: PropTypes.instanceOf(Map),
  passenger55555Departments: PropTypes.instanceOf(Map),
  onUpdatePassenger55555Department: PropTypes.func,
  onUpdateDepartmentsAndRecalculate: PropTypes.func,
  tripsRemovedFromReview: PropTypes.instanceOf(Set),
  guestRidesRemoved: PropTypes.instanceOf(Set),
  onRemoveGuestRide: PropTypes.func
};

ZeroPriceRides.defaultProps = {
  employeeMap: new Map(),
  onUpdatePrice: null,
  updatedPrices: new Map(),
  passenger55555Departments: new Map(),
  onUpdatePassenger55555Department: null,
  onUpdateDepartmentsAndRecalculate: null,
  tripsRemovedFromReview: new Set(),
  guestRidesRemoved: new Set(),
  onRemoveGuestRide: null
};

export default ZeroPriceRides;

