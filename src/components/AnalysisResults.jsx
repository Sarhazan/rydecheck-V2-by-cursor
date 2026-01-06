// React
import { useState, useMemo, useCallback, memo } from 'react';

// Framer Motion
import { motion, AnimatePresence } from 'framer-motion';

// Components
import GettMatchModal from './GettMatchModal';

// Utils
import { getStatusText } from '../utils/rideMatcher';
import { shouldShowNotesField } from '../utils/supplierHelpers';
import { useSummary } from './AnalysisResults/hooks/useSummary';
import { useFilteredResults } from './AnalysisResults/hooks/useFilteredResults';
import { logActivity, getAllActivities } from '../utils/activityLogger';

// Icons
import { CheckCircle2, AlertCircle, XCircle, TrendingUp, DollarSign, Users, FileX, Plus, Edit2, Check, X, ArrowUp, ArrowDown, Download } from 'lucide-react';

/**
 * קומפוננטה להצגת תוצאות ניתוח התאמות בין נסיעות רייד לספקים
 * @param {Object} matchResults - תוצאות ההתאמות לכל ספק
 * @param {Map} employeeMap - מפת עובדים (employeeId -> employee)
 * @param {Array} rides - מערך של כל נסיעות הרייד
 * @param {Function} onAddToRide - פונקציה להוספת נסיעה ידנית לרייד
 * @param {Map} manuallyAddedRides - מפת נסיעות שנוספו ידנית
 */
const AnalysisResults = memo(function AnalysisResults({ matchResults, employeeMap, rides = [], onAddToRide, manuallyAddedRides = new Map(), onManualGettMatch, manualGettMatches = new Map(), rideNotes = new Map(), onUpdateNote, tripsForReviewByRide: externalTripsForReviewByRide, onUpdateTripsForReview, tripsRemovedFromReview: externalTripsRemovedFromReview, onUpdateTripsRemovedFromReview, updatedPrices = new Map(), onUpdatePrice, activityLogs = [], setActivityLogs }) {
  const [selectedSupplier, setSelectedSupplier] = useState('bontour');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedRideForMatch, setSelectedRideForMatch] = useState(null);
  const [cancellationFilter, setCancellationFilter] = useState('all'); // 'all' | 'no_cancellations'
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all' | 'not_review' | 'for_review'
  const [priceDiffFilter, setPriceDiffFilter] = useState('all'); // 'all' | 'credit' | 'debit'
  const [editingRideId, setEditingRideId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  // שימוש ב-state חיצוני אם קיים, אחרת state פנימי
  // אם יש prop חיצוני, לא נשתמש ב-useState פנימי כדי למנוע איפוס
  const [internalTripsForReviewByRide, setInternalTripsForReviewByRide] = useState(() => {
    // אם יש prop חיצוני, לא נשתמש ב-useState פנימי
    if (externalTripsForReviewByRide !== undefined) {
      return new Set(); // זה לא ישמש, אבל React דורש ערך התחלתי
    }
    return new Set();
  });
  
  // תמיד נשתמש ב-prop חיצוני אם הוא קיים, אחרת ב-state פנימי
  const tripsForReviewByRide = externalTripsForReviewByRide !== undefined ? externalTripsForReviewByRide : internalTripsForReviewByRide;
  const setTripsForReviewByRide = onUpdateTripsForReview || setInternalTripsForReviewByRide;
  
  // State לנסיעות שהוסרו מבדיקה
  const [internalTripsRemovedFromReview, setInternalTripsRemovedFromReview] = useState(() => {
    if (externalTripsRemovedFromReview !== undefined) {
      return new Set();
    }
    return new Set();
  });
  const tripsRemovedFromReview = externalTripsRemovedFromReview !== undefined ? externalTripsRemovedFromReview : internalTripsRemovedFromReview;
  const setTripsRemovedFromReview = onUpdateTripsRemovedFromReview || setInternalTripsRemovedFromReview;
  
  // שמות הספקים לתצוגה
  const supplierNames = {
    bontour: 'בון תור',
    hori: 'חורי',
    gett: 'גט'
  };

  // שמות אפשריים של כל ספק בקובץ הרייד (לזיהוי נסיעות)
  const supplierRideNames = {
    bontour: ['בון תור', 'בוןתור', 'צוות גיל'],
    hori: ['מוניות דוד חורי', 'חורי', 'דוד חורי', 'מוניות דוד חורי בעמ'],
    gett: ['gett', 'גט', 'GETT']
  };

  /**
   * המרת מחרוזת נוסעים (PID numbers) לשמות עובדים
   * @param {string} passengersStr - מחרוזת עם מספרי PID מופרדים בפסיקים/פסיקים
   * @returns {string} מחרוזת עם שמות העובדים או המחרוזת המקורית אם לא נמצאו שמות
   */
  const getEmployeeNames = useCallback((passengersStr) => {
    if (!passengersStr || !employeeMap) return passengersStr || '-';
    
    const trimmed = String(passengersStr).trim();
    const parts = trimmed.split(/[,;|\s]+/).filter(p => p.trim().length > 0);
    if (parts.length === 0) return passengersStr;
    
    const names = [];
    let foundAnyName = false;
    
    parts.forEach(part => {
      const trimmedPart = part.trim();
      const numberMatch = trimmedPart.match(/^\d+$/);
      if (numberMatch) {
        const employeeId = parseInt(numberMatch[0]);
        if (!isNaN(employeeId)) {
          const employee = employeeMap.get(employeeId);
          if (employee) {
            names.push(`${employee.firstName} ${employee.lastName}`.trim());
            foundAnyName = true;
          } else {
            names.push(trimmedPart);
          }
        } else {
          names.push(trimmedPart);
        }
      } else {
        names.push(trimmedPart);
      }
    });
    
    return foundAnyName ? names.join(', ') : passengersStr;
  }, [employeeMap]);

  /**
   * המרת מחרוזת תאריך לאובייקט Date למיון
   * תומך בפורמטים: DD/MM/YYYY, DD-MM-YYYY, עם או בלי שעה
   */
  const parseDateForSort = useCallback((dateStr) => {
    if (!dateStr) return null;
    
    let dateParts, timeParts = ['00', '00'];
    
    if (dateStr.includes(' ')) {
      const parts = dateStr.split(' ');
      dateStr = parts[0];
      const timeStr = parts[1] || '';
      if (timeStr) {
        timeParts = timeStr.split(':');
      }
    }
    
    if (dateStr.includes('/')) {
      dateParts = dateStr.split('/');
    } else if (dateStr.includes('-')) {
      dateParts = dateStr.split('-').reverse();
    } else {
      return null;
    }
    
    if (dateParts.length < 3) return null;
    
    const day = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1;
    const year = parseInt(dateParts[2]);
    const hours = parseInt(timeParts[0]) || 0;
    const minutes = parseInt(timeParts[1]) || 0;
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    
    return new Date(year, month, day, hours, minutes);
  }, []);

  const formatDateWithTime = useCallback((dateStr, timeStr = null) => {
    if (!dateStr) return '-';
    
    if (dateStr.includes(' ')) {
      return dateStr;
    }
    
    if (timeStr && timeStr.trim()) {
      return `${dateStr} ${timeStr.trim()}`;
    }
    
    return dateStr;
  }, []);


  // פונקציה לקבלת מחיר מעודכן או מקורי
  const getPrice = useCallback((rideId, originalPrice) => {
    if (updatedPrices.has(rideId)) {
      return updatedPrices.get(rideId);
    }
    return originalPrice || 0;
  }, [updatedPrices]);

  /**
   * חישוב סיכום סטטיסטיקות עבור הספק הנבחר
   * כולל: מספר תואמים, חסרים, הפרשי מחיר, וכו'
   */
  const summary = useSummary(
    matchResults,
    selectedSupplier,
    supplierRideNames,
    tripsRemovedFromReview,
    updatedPrices,
    manualGettMatches,
    manuallyAddedRides
  );

  const currentResults = useFilteredResults(
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
  );

  const getStatusBadgeClass = useCallback((status) => {
    const classes = {
      'matched': 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200',
      'price_difference': 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border border-yellow-200',
      'missing_in_ride': 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200',
      'missing_in_ride_or_assigned_to_other': 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 border border-purple-200',
      'missing_in_supplier': 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200',
      'removed_from_ride': 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border border-gray-200',
      'not_matched': 'bg-gradient-to-r from-orange-100 to-orange-50 text-orange-800 border border-orange-200',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }, []);

  const handleSupplierChange = useCallback((supplier) => {
    setSelectedSupplier(supplier);
    setStatusFilter('all');
    setCancellationFilter('all');
    setReviewFilter('all');
    setPriceDiffFilter('all');
  }, []);

  const handleFilterChange = useCallback((e) => {
    setStatusFilter(e.target.value);
    // איפוס בורר ביטולים כאשר משנים סטטוס
    if ((e.target.value !== 'missing_in_ride' && e.target.value !== 'missing_in_ride_or_assigned_to_other' && e.target.value !== 'price_difference') || 
        (e.target.value === 'missing_in_ride' && selectedSupplier !== 'gett') ||
        (e.target.value === 'missing_in_ride_or_assigned_to_other' && selectedSupplier !== 'gett')) {
      setCancellationFilter('all');
    }
    // איפוס בורר בדיקה כאשר משנים סטטוס
    if (e.target.value !== 'missing_in_supplier' || selectedSupplier !== 'gett') {
      setReviewFilter('all');
    }
    // איפוס בורר הפרשי מחיר כאשר משנים סטטוס
    if (e.target.value !== 'price_difference') {
      setPriceDiffFilter('all');
    }
  }, [selectedSupplier]);


  // פונקציה לפתיחת עריכה
  const handleEditClick = useCallback((match) => {
    const rideId = match.ride?.rideId;
    if (!rideId) return;
    const currentPrice = getPrice(rideId, match.ride.price);
    setEditPrice(currentPrice.toString());
    setEditingRideId(rideId);
  }, [getPrice]);

  // פונקציה לשמירת מחיר
  const handleSavePrice = useCallback((rideId) => {
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
  }, [editPrice, onUpdatePrice]);

  // פונקציה לביטול עריכה
  const handleCancelEdit = useCallback(() => {
    setEditingRideId(null);
    setEditPrice('');
  }, []);

  // פונקציה לטיפול ב-Enter בשדה עריכה
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editingRideId) {
        handleSavePrice(editingRideId);
      }
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [editingRideId, handleSavePrice, handleCancelEdit]);

  // יצירת callback יציב להעברת נסיעות רייד לבדיקה
  const handleMoveToReview = useCallback((rideId) => {
    if (!rideId) return;
    setTripsForReviewByRide(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rideId)) {
        // מסירים מבדיקה - מוסיפים לרשימת נסיעות שהוסרו
        newSet.delete(rideId);
        setTripsRemovedFromReview(prevRemoved => {
          const newRemovedSet = new Set(prevRemoved);
          newRemovedSet.add(rideId);
          return newRemovedSet;
        });
        
        // הוספת לוג - נסיעה הוסרה (רק אם עדיין לא נוסף)
        const ride = rides.find(r => r.rideId === rideId);
        if (ride && setActivityLogs) {
          // בדיקה אם הלוג כבר קיים - מונע כפילויות
          const allActivitiesBefore = getAllActivities();
          const existingRideRemovedLog = allActivitiesBefore.find(
            a => a.type === 'ride_removed' && 
            a.rideId === rideId && 
            (Date.now() - a.timestamp) < 1000 // לוג שנוסף בשנייה האחרונה
          );
          
          if (!existingRideRemovedLog) {
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
            // אם לא נמצא, נשתמש ב-selectedSupplier
            if (!supplier) {
              supplier = selectedSupplier;
            }
            
            // המרת שם הספק לעברית
            const supplierName = supplierNames[supplier] || supplier;
            logActivity('ride_removed', rideId, ride, { supplier: supplierName });
            setActivityLogs(getAllActivities());
          }
        }
      } else {
        // מוסיפים לבדיקה - מסירים מרשימת נסיעות שהוסרו (אם היו שם)
        newSet.add(rideId);
        setTripsRemovedFromReview(prevRemoved => {
          const newRemovedSet = new Set(prevRemoved);
          if (newRemovedSet.has(rideId)) {
            newRemovedSet.delete(rideId);
          }
          return newRemovedSet;
        });
      }
      return newSet;
    });
  }, [setTripsRemovedFromReview, rides, setActivityLogs]);

  if (!matchResults || Object.keys(matchResults).length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 animate-fade-in">
        אין תוצאות להצגה. אנא טען קבצים והרץ ניתוח.
      </div>
    );
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.4,
        ease: "easeOut"
      }
    }),
    hover: {
      scale: 1.03,
      y: -4,
      transition: { duration: 0.2 }
    }
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.02,
        duration: 0.3
      }
    })
  };

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* בחירת ספק */}
      <div className="flex gap-2 border-b border-gray-200">
        {Object.keys(supplierNames).map(supplier => (
          <button
            key={supplier}
            onClick={() => handleSupplierChange(supplier)}
            className={`relative px-6 py-3 font-semibold transition-all duration-300 ${
              selectedSupplier === supplier
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {supplierNames[supplier]}
            {selectedSupplier === supplier && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-purple-500"
                layoutId="activeTab"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* סיכום */}
      <div className="grid grid-cols-2 md:grid-cols-8 gap-4">
        <motion.div 
          className="space-y-2"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={0}
        >
          <motion.div 
            className="card-modern bg-gradient-to-br from-white to-gray-50"
            whileHover="hover"
            variants={cardVariants}
          >
            <div className="flex items-center gap-2 mb-2">
              <FileX className="w-5 h-5 text-gray-500" />
              <div className="text-sm text-gray-600">סה"כ נסיעות (רייד)</div>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              {summary.totalRides}
            </div>
          </motion.div>
          <motion.div 
            className="card-modern bg-gradient-to-br from-gray-50 to-gray-100"
            whileHover="hover"
            variants={cardVariants}
          >
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-gray-500" />
              <div className="text-sm text-gray-600">נסיעות ספק</div>
            </div>
            <div className="text-3xl font-bold text-gray-700">{summary.supplierRides}</div>
          </motion.div>
        </motion.div>
        
        <motion.div 
          className="card-modern bg-gradient-to-br from-green-50 to-green-100 border border-green-200"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={1}
          whileHover="hover"
        >
          <div className="flex items-center gap-2 mb-2 min-w-0">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="text-sm text-gray-700 font-medium truncate">תואמים</div>
          </div>
          <div className="text-3xl font-bold text-green-600 truncate">{summary.matched}</div>
        </motion.div>
        
        {selectedSupplier !== 'gett' && (
          <motion.div 
            className="card-modern bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={2}
            whileHover="hover"
          >
            <div className="flex items-center gap-2 mb-2 min-w-0">
              <TrendingUp className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <div className="text-sm text-gray-700 font-medium truncate">הפרש מחיר</div>
            </div>
            <div className="text-3xl font-bold text-yellow-600 truncate">{summary.priceDiff}</div>
          </motion.div>
        )}
        
        {selectedSupplier === 'gett' && (
          <motion.div 
            className="card-modern bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={2}
            whileHover="hover"
          >
            <div className="flex items-center gap-2 mb-2 min-w-0">
              <TrendingUp className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <div className="text-sm text-gray-700 font-medium truncate">הפרש מחיר</div>
            </div>
            <div className="text-3xl font-bold text-yellow-600 truncate">{summary.priceDiff}</div>
          </motion.div>
        )}
        
        <motion.div 
          className="space-y-2"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={3}
        >
          <motion.div 
            className="card-modern bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200"
            variants={cardVariants}
            whileHover="hover"
          >
            <div className="flex items-center gap-2 mb-2 min-w-0">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <div className="text-sm text-gray-700 font-medium truncate">חסר בספק</div>
            </div>
            <div className="text-3xl font-bold text-orange-600 truncate">{summary.missingInSupplier || 0}</div>
          </motion.div>
          
          <motion.div 
            className="card-modern bg-gradient-to-br from-red-50 to-red-100 border border-red-200"
            variants={cardVariants}
            whileHover="hover"
          >
            <div className="flex items-center gap-2 mb-2 min-w-0">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="text-sm text-gray-700 font-medium truncate">חסר ברייד</div>
            </div>
            <div className="text-3xl font-bold text-red-600 truncate">{summary.missingInRide || 0}</div>
          </motion.div>
        </motion.div>
        
        {selectedSupplier === 'gett' && (
          <motion.div 
            className="card-modern bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={4}
            whileHover="hover"
          >
            <div className="flex items-center gap-2 mb-2 min-w-0">
              <Users className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <div className="text-sm text-gray-700 font-medium truncate">רשום על ספק אחר</div>
            </div>
            <div className="text-3xl font-bold text-purple-600 truncate">{summary.assignedToOtherSupplier || 0}</div>
          </motion.div>
        )}
        
            <motion.div 
              className="card-modern bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
          custom={selectedSupplier !== 'gett' ? 4 : 5}
              whileHover="hover"
            >
          <div className="flex items-center gap-2 mb-2 min-w-0">
            <DollarSign className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="text-sm text-gray-700 font-medium truncate">סכום הפרשי מחיר</div>
              </div>
          <div className="text-3xl font-bold text-blue-600 truncate">
                ₪{Math.round(summary.totalPriceDiff || 0).toLocaleString('he-IL', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
              </div>
            </motion.div>
        
            <motion.div 
          className="space-y-2"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
          custom={selectedSupplier !== 'gett' ? 6 : 5}
        >
          <motion.div 
            className="card-modern bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200"
              whileHover="hover"
            variants={cardVariants}
          >
            <div className="flex items-center gap-2 mb-2 min-w-0">
              <DollarSign className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <div className="text-xs text-gray-700 font-medium leading-tight break-words" style={{ wordBreak: 'break-word' }}>מחיר לספק (רייד)</div>
              </div>
            <div className="text-2xl font-bold text-indigo-600 break-all">₪{summary.ridePriceForSupplier?.toFixed(2) || '0.00'}</div>
            </motion.div>
          <motion.div 
            className="card-modern bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200"
            whileHover="hover"
            variants={cardVariants}
          >
            <div className="flex items-center gap-2 mb-2 min-w-0">
              <DollarSign className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <div className="text-xs text-gray-700 font-medium leading-tight break-words" style={{ wordBreak: 'break-word' }}>חשבונית ספק</div>
            </div>
            <div className="text-2xl font-bold text-purple-600 break-all">₪{summary.supplierInvoice?.toFixed(2) || '0.00'}</div>
          </motion.div>
        </motion.div>
      </div>

      {/* סינון */}
      <motion.div 
        className="flex gap-2 items-center flex-wrap"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <label className="text-sm font-semibold text-gray-700">סינון לפי סטטוס:</label>
        <select
          value={statusFilter}
          onChange={handleFilterChange}
          className="border-2 border-gray-300 rounded-xl px-4 py-2 text-sm font-medium bg-white hover:border-primary-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all duration-200"
        >
          <option value="all">הכל</option>
          <option value="matched">תואם</option>
          <option value="price_difference">הפרש מחיר</option>
          <option value="missing_in_ride">חסר ברייד</option>
          {selectedSupplier === 'gett' && (
            <option value="missing_in_ride_or_assigned_to_other">חסר ברייד / רשום על ספק אחר</option>
          )}
          <option value="missing_in_supplier">חסר בספק</option>
        </select>
        
        {/* בורר ביטולים - עבור גט + missing_in_ride או עבור כל הספקים + price_difference */}
        {((selectedSupplier === 'gett' && (statusFilter === 'missing_in_ride' || statusFilter === 'missing_in_ride_or_assigned_to_other')) || 
          statusFilter === 'price_difference') && (
          <>
            <label className="text-sm font-semibold text-gray-700 mr-2">סינון ביטולים:</label>
            <select
              value={cancellationFilter}
              onChange={(e) => setCancellationFilter(e.target.value)}
              className="border-2 border-gray-300 rounded-xl px-4 py-2 text-sm font-medium bg-white hover:border-primary-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all duration-200"
            >
              <option value="all">כל הנסיעות</option>
              <option value="no_cancellations">ביטולי נסיעות בלבד</option>
            </select>
          </>
        )}
        
        {/* בורר בדיקה - רק עבור גט + missing_in_supplier */}
        {selectedSupplier === 'gett' && statusFilter === 'missing_in_supplier' && (
          <>
            <label className="text-sm font-semibold text-gray-700 mr-2">סינון בדיקה:</label>
            <select
              value={reviewFilter}
              onChange={(e) => setReviewFilter(e.target.value)}
              className="border-2 border-gray-300 rounded-xl px-4 py-2 text-sm font-medium bg-white hover:border-primary-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all duration-200"
            >
              <option value="all">חסר בספק (כל הנסיעות)</option>
              <option value="not_review">חסר בספק (מצב בדיקה)</option>
              <option value="for_review">חסר בספק (נסיעות לבדיקה)</option>
            </select>
          </>
        )}
        
        {/* כפתור ייצוא - רק עבור missing_in_supplier */}
        {statusFilter === 'missing_in_supplier' && currentResults.length > 0 && (
          <motion.button
            onClick={() => {
              // טעינה דינמית של excelExporter
              import('../utils/excelExporter').then(({ exportMissingInSupplier }) => {
                exportMissingInSupplier(currentResults, selectedSupplier);
              }).catch(err => {
                console.error('שגיאה בייצוא נסיעות חסר בספק:', err);
                alert('שגיאה בייצוא נסיעות חסר בספק');
              });
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download className="w-4 h-4" />
            ייצא נסיעות
          </motion.button>
        )}

        {/* בורר הפרשי מחיר - רק עבור price_difference */}
        {statusFilter === 'price_difference' && (
          <>
            <label className="text-sm font-semibold text-gray-700 mr-2">סינון הפרשי מחיר:</label>
            <select
              value={priceDiffFilter}
              onChange={(e) => setPriceDiffFilter(e.target.value)}
              className="border-2 border-gray-300 rounded-xl px-4 py-2 text-sm font-medium bg-white hover:border-primary-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all duration-200"
            >
              <option value="all">כל הפרשי המחיר</option>
              <option value="credit">הפרשי זכות</option>
              <option value="debit">הפרשי חובה</option>
            </select>
          </>
        )}
      </motion.div>

      {/* טבלה */}
      <motion.div 
        className="overflow-x-auto bg-white rounded-2xl shadow-soft border border-gray-100"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              {(statusFilter === 'missing_in_ride' || statusFilter === 'missing_in_ride_or_assigned_to_other') ? (
                <>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {selectedSupplier === 'gett' ? 'מספר הזמנה גט' : 'מספר הזמנה'}
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    תאריך
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    מקור (ספק)
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    יעד (ספק)
                  </th>
                  {selectedSupplier !== 'hori' && (
                    <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      שמות עובדים (ספק)
                    </th>
                  )}
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    הערות ספק
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    מחיר ספק
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    סטטוס
                  </th>
                  {selectedSupplier === 'gett' && (statusFilter === 'missing_in_ride' || statusFilter === 'missing_in_ride_or_assigned_to_other') && (
                    <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      הערות
                    </th>
                  )}
                  {(statusFilter === 'missing_in_ride' || statusFilter === 'missing_in_ride_or_assigned_to_other') && (
                    <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      פעולה
                    </th>
                  )}
                </>
              ) : statusFilter === 'missing_in_supplier' ? (
                <>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    קוד נסיעה
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    תאריך
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    מקור
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    יעד
                  </th>
                  {selectedSupplier === 'gett' && (
                    <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      נוסעים
                    </th>
                  )}
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    מחיר רייד
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    סטטוס
                  </th>
                  {((selectedSupplier === 'bontour' || selectedSupplier === 'hori') && statusFilter === 'missing_in_supplier') && (
                    <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      פעולה
                    </th>
                  )}
                  {selectedSupplier === 'gett' && (
                    <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      פעולה
                    </th>
                  )}
                  {selectedSupplier === 'gett' && (
                    <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      הערות
                    </th>
                  )}
                </>
              ) : (
                <>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    קוד נסיעה / מספר הזמנה
                  </th>
                  {selectedSupplier === 'gett' && (
                    <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      מספר הזמנה גט
                    </th>
                  )}
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    תאריך
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    מקור
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    יעד
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    שמות עובדים
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    מחיר רייד
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    מחיר ספק
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[120px]">
                    הפרש
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    הערות
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    סטטוס
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            <AnimatePresence mode="wait">
              {currentResults.length === 0 ? (
                <motion.tr
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <td colSpan={
                    (statusFilter === 'missing_in_ride' || statusFilter === 'missing_in_ride_or_assigned_to_other')
                      ? (selectedSupplier === 'gett' && (statusFilter === 'missing_in_ride' || statusFilter === 'missing_in_ride_or_assigned_to_other') ? 10 : 
                         selectedSupplier === 'hori' ? 8 : 9) : 
                    statusFilter === 'missing_in_supplier' ? 6 : 
                    (selectedSupplier === 'gett' ? 11 : 10)
                  } className="px-4 py-12 text-center text-gray-500">
                    אין תוצאות
                  </td>
                </motion.tr>
              ) : (
                currentResults.map((match, index) => (
                  <motion.tr 
                    key={`${match.ride?.rideId || match.supplierData?.orderNumber || index}-${index}`}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                    className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-colors duration-200"
                  >
                    {(statusFilter === 'missing_in_ride' || statusFilter === 'missing_in_ride_or_assigned_to_other') ? (
                      <>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {match.supplierData ? (
                            selectedSupplier === 'hori' 
                              ? (match.supplierData.tripNumber || '-')
                              : (match.supplierData.orderNumber || match.supplierData.orderId || '-')
                          ) : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {match.supplierData ? (() => {
                            const date = match.supplierData.date || '';
                            const time = match.supplierData.time || '';
                            // אם התאריך כבר כולל זמן, נציג אותו כמו שהוא
                            if (date && date.includes(' ')) {
                              return date;
                            }
                            // אחרת, נצרף את הזמן אם יש
                            if (date && time) {
                              return `${date} ${time}`;
                            }
                            // אם יש רק תאריך, נציג אותו
                            return date || '-';
                          })() : '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {match.supplierData && match.supplierData.source ? match.supplierData.source : '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {match.supplierData && match.supplierData.destination ? match.supplierData.destination : '-'}
                        </td>
                        {selectedSupplier !== 'hori' && (
                          <td className="px-4 py-4 text-sm text-gray-900">
                            <div className="flex flex-col gap-1">
                            {match.supplierData ? getEmployeeNames(match.supplierData.passengers) : '-'}
                              {selectedSupplier === 'gett' && 
                               match.supplierData && 
                               match.supplierData.price === 28 && (
                                <motion.span
                                  className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800 w-fit"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                >
                                  ביטול מונית
                                </motion.span>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                          {match.supplierData && match.supplierData.supplierNotes ? (
                            <div className="text-xs text-gray-600 break-words">
                              {match.supplierData.supplierNotes}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {match.supplierData ? `₪${match.supplierData.price.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {statusFilter === 'missing_in_ride_or_assigned_to_other' && match.ride ? (
                            <div className="flex flex-col gap-1">
                              <motion.span 
                                className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass('missing_in_ride_or_assigned_to_other')}`}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: index * 0.02 + 0.1 }}
                              >
                                רשום על ספק אחר
                              </motion.span>
                              <div className="text-xs text-gray-600 mt-1">
                                <div>RIDE ID: {match.ride.rideId}</div>
                                <div>ספק: {match.ride.supplier || '-'}</div>
                              </div>
                            </div>
                          ) : (
                            <motion.span 
                              className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(match.status)}`}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: index * 0.02 + 0.1 }}
                            >
                              {getStatusText(match.status)}
                            </motion.span>
                          )}
                        </td>
                        {selectedSupplier === 'gett' && (statusFilter === 'missing_in_ride' || statusFilter === 'missing_in_ride_or_assigned_to_other') && (
                          <td className="px-4 py-4">
                            {(() => {
                              // עבור missing_in_ride_or_assigned_to_other, נשתמש ב-rideId אם יש
                              // עבור missing_in_ride, נשתמש ב-orderNumber כמפתח
                              const noteKey = match.ride?.rideId || match.supplierData?.orderNumber || match.supplierData?.orderId;
                              if (!noteKey) return '-';
                              
                              // עבור missing_in_ride, נשתמש במפתח מיוחד עם prefix
                              const finalKey = match.ride?.rideId 
                                ? noteKey 
                                : `gett_missing_${noteKey}`;
                              
                              return (
                                <textarea
                                  value={rideNotes.get(finalKey) || ''}
                                  onChange={(e) => {
                                    if (onUpdateNote) {
                                      onUpdateNote(finalKey, e.target.value);
                                    }
                                  }}
                                  placeholder="הוסף הערה..."
                                  className="w-full min-w-[200px] max-w-[300px] px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all duration-200 resize-none"
                                  rows={2}
                                />
                              );
                            })()}
                          </td>
                        )}
                        {(statusFilter === 'missing_in_ride' || statusFilter === 'missing_in_ride_or_assigned_to_other') && (
                          <td className="px-4 py-4 whitespace-nowrap">
                            {(() => {
                              const key = `${selectedSupplier}_${match.supplierData?.orderNumber || match.supplierData?.orderId || ''}`;
                              const isAlreadyAdded = manuallyAddedRides.has(key);
                              
                              if (isAlreadyAdded) {
                                return (
                                  <motion.span
                                    className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                  >
                                    <CheckCircle2 className="w-3 h-3 ml-1" />
                                    נוסף לרייד
                                  </motion.span>
                                );
                              }
                              
                              return (
                                <motion.button
                                  onClick={() => {
                                    if (onAddToRide && match.supplierData) {
                                      onAddToRide(selectedSupplier, match.supplierData);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Plus className="w-3 h-3" />
                                  הוסף לרייד
                                </motion.button>
                              );
                            })()}
                          </td>
                        )}
                      </>
                    ) : statusFilter === 'missing_in_supplier' ? (
                      <>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {match.ride ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span>{match.ride.rideId}</span>
                                {selectedSupplier === 'gett' && (() => {
                                  const rideId = match.ride.rideId;
                                  const isInReview = tripsForReviewByRide && typeof tripsForReviewByRide.has === 'function' ? tripsForReviewByRide.has(rideId) : false;
                                  const isRemoved = rideId && tripsRemovedFromReview && typeof tripsRemovedFromReview.has === 'function' && tripsRemovedFromReview.has(rideId);
                                  
                                  if (isInReview && isRemoved) {
                                    // נסיעה שנמצאת בבדיקה וגם הוסרה מהרייד
                                    return (
                                      <motion.span
                                        className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadgeClass('removed_from_ride')}`}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                      >
                                        הוסר מהרייד
                                      </motion.span>
                                    );
                                  } else if (isInReview) {
                                    // נסיעה שנמצאת בבדיקה בלבד
                                    return (
                                      <motion.span
                                        className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                      >
                                        בבדיקה
                                      </motion.span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                              {match.ride.isManual && (
                                <span className="text-xs text-blue-600 font-semibold">
                                  נוסף ידנית - מספר הזמנה: {match.ride.supplierOrderNumber || '-'}
                                </span>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {match.ride ? formatDateWithTime(match.ride.date) : '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {match.ride ? match.ride.source : '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {match.ride ? match.ride.destination : '-'}
                        </td>
                        {selectedSupplier === 'gett' && (
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {match.ride && match.ride.passengers ? getEmployeeNames(match.ride.passengers) : '-'}
                          </td>
                        )}
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {match.ride ? `₪${match.ride.price.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {(() => {
                            const rideId = match.ride?.rideId;
                            const isRemoved = rideId && 
                                             tripsRemovedFromReview && 
                                             typeof tripsRemovedFromReview.has === 'function' && 
                                             tripsRemovedFromReview.has(rideId);
                            
                            const displayStatus = isRemoved ? 'removed_from_ride' : match.status;
                            const displayText = isRemoved ? 'הוסר מרייד' : getStatusText(match.status);
                            
                            return (
                          <motion.span 
                                className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(displayStatus)}`}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: index * 0.02 + 0.1 }}
                          >
                                {displayText}
                          </motion.span>
                            );
                          })()}
                        </td>
                        {((selectedSupplier === 'bontour' || selectedSupplier === 'hori') && statusFilter === 'missing_in_supplier') ? (
                          <td className="px-4 py-4 whitespace-nowrap">
                            {(() => {
                              const rideId = match.ride?.rideId;
                              const isRemoved = rideId && tripsRemovedFromReview && typeof tripsRemovedFromReview.has === 'function' && tripsRemovedFromReview.has(rideId);
                              
                              if (isRemoved) {
                                return null; // נסיעה שהוסרה לא תוצג
                              }
                              
                              return (
                                <motion.button
                                  onClick={() => {
                                    if (rideId) {
                                      handleMoveToReview(rideId);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  הסר
                                </motion.button>
                              );
                            })()}
                          </td>
                        ) : null}
                        {selectedSupplier === 'gett' && (
                          <td className="px-4 py-4 whitespace-nowrap">
                            {(() => {
                              const rideId = match.ride?.rideId;
                              const isAlreadyMatched = rideId && manualGettMatches.has(rideId);
                              const isInReview = rideId && tripsForReviewByRide && typeof tripsForReviewByRide.has === 'function' ? tripsForReviewByRide.has(rideId) : false;
                              
                              if (isAlreadyMatched) {
                                return (
                                  <motion.span
                                    className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                  >
                                    <CheckCircle2 className="w-3 h-3 ml-1" />
                                    מותאם
                                  </motion.span>
                                );
                              }
                              
                              if (isInReview) {
                                // בדיקה אם הנסיעה גם הוסרה מהרייד
                                const isRemoved = rideId && tripsRemovedFromReview && typeof tripsRemovedFromReview.has === 'function' && tripsRemovedFromReview.has(rideId);
                                
                                // If in "for_review" filter mode, show both label and remove button
                                if (reviewFilter === 'for_review') {
                                  return (
                                    <div className="flex flex-col gap-2">
                                      <motion.span
                                        className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${isRemoved ? getStatusBadgeClass('removed_from_ride') : 'bg-yellow-100 text-yellow-800'}`}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                      >
                                        {isRemoved ? 'הוסר מהרייד' : 'בבדיקה'}
                                      </motion.span>
                                      <div className="flex items-center gap-2">
                                        <motion.button
                                          onClick={() => {
                                            if (rideId) {
                                              handleMoveToReview(rideId);
                                            }
                                          }}
                                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors"
                                          whileHover={{ scale: 1.05 }}
                                          whileTap={{ scale: 0.95 }}
                                        >
                                          הסר
                                        </motion.button>
                                        <motion.button
                                          onClick={() => {
                                            if (match.ride) {
                                              setSelectedRideForMatch(match.ride);
                                              setShowMatchModal(true);
                                            }
                                          }}
                                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                                          whileHover={{ scale: 1.05 }}
                                          whileTap={{ scale: 0.95 }}
                                        >
                                          התאם
                                        </motion.button>
                                      </div>
                                    </div>
                                  );
                                }
                                // Otherwise, show only the label
                                // isRemoved כבר הוגדר למעלה (שורה 973)
                                return (
                                  <motion.span
                                    className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${isRemoved ? getStatusBadgeClass('removed_from_ride') : 'bg-yellow-100 text-yellow-800'}`}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                  >
                                    {isRemoved ? 'הוסר מהרייד' : 'בבדיקה'}
                                  </motion.span>
                                );
                              }
                              
                              // בדיקה אם הנסיעה הוסרה מהרייד
                              const isRemoved = rideId && tripsRemovedFromReview && typeof tripsRemovedFromReview.has === 'function' && tripsRemovedFromReview.has(rideId);
                              
                              if (isRemoved) {
                                // נסיעה שהוסרה מהרייד - לא מציגים כפתור "העבר לבדיקה"
                                return null;
                              }
                              
                              return (
                                <div className="flex items-center gap-2">
                                  <motion.button
                                    onClick={() => {
                                      if (rideId) {
                                        handleMoveToReview(rideId);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    העבר לבדיקה
                                  </motion.button>
                                  <motion.button
                                    onClick={() => {
                                      if (match.ride) {
                                        setSelectedRideForMatch(match.ride);
                                        setShowMatchModal(true);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    התאם
                                  </motion.button>
                                </div>
                              );
                            })()}
                          </td>
                        )}
                        {selectedSupplier === 'gett' && (
                          <td className="px-4 py-4">
                            <textarea
                              value={match.ride ? (rideNotes.get(match.ride.rideId) || '') : ''}
                              onChange={(e) => {
                                if (onUpdateNote && match.ride) {
                                  onUpdateNote(match.ride.rideId, e.target.value);
                                }
                              }}
                              placeholder="הוסף הערה..."
                              className="w-full min-w-[200px] max-w-[300px] px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all duration-200 resize-none"
                              rows={2}
                            />
                          </td>
                        )}
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {match.ride ? (
                            <div className="flex flex-col gap-1">
                              <span>{match.ride.rideId}</span>
                              {match.ride.isManual && (
                                <span className="text-xs text-blue-600 font-semibold">
                                  נוסף ידנית - מספר הזמנה: {match.ride.supplierOrderNumber || '-'}
                                </span>
                              )}
                            </div>
                          ) : (match.supplierData && match.supplierData.orderNumber ? match.supplierData.orderNumber : '-')}
                        </td>
                        {selectedSupplier === 'gett' && (
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            {match.supplierData && match.supplierData.orderNumber 
                              ? match.supplierData.orderNumber 
                              : '-'}
                          </td>
                        )}
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {match.ride ? formatDateWithTime(match.ride.date) : (match.supplierData && match.supplierData.date ? formatDateWithTime(match.supplierData.date, match.supplierData.time) : '-')}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {match.ride ? (match.ride.source || '-') : (match.supplierData && match.supplierData.source ? match.supplierData.source : '-')}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {match.ride ? (match.ride.destination || '-') : (match.supplierData && match.supplierData.destination ? match.supplierData.destination : '-')}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          <div className="flex flex-col gap-1">
                            {match.ride && match.ride.passengers ? getEmployeeNames(match.ride.passengers) : (match.supplierData && match.supplierData.passengers ? getEmployeeNames(match.supplierData.passengers) : '-')}
                            {selectedSupplier === 'gett' && 
                             match.supplierData && 
                             match.supplierData.price === 28 && (
                              <motion.span
                                className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800 w-fit"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                              >
                                ביטול מונית
                              </motion.span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {(() => {
                            const rideId = match.ride?.rideId;
                            const canEdit = ((selectedSupplier === 'bontour' || selectedSupplier === 'hori') && 
                                            match.status === 'price_difference') ||
                                           (selectedSupplier === 'gett' && 
                                            match.status === 'matched' && 
                                            match.priceDifference !== null && 
                                            match.priceDifference !== undefined && 
                                            match.priceDifference > 0.01) &&
                                           match.ride && 
                                           onUpdatePrice;
                            
                            if (!rideId) return '-';
                            
                            const displayPrice = getPrice(rideId, match.ride.price);
                            const hasUpdatedPrice = updatedPrices.has(rideId);
                            
                            if (canEdit && editingRideId === rideId) {
                              return (
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
                                    onClick={() => handleSavePrice(rideId)}
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
                              );
                            }
                            
                            return (
                              <div className="flex items-center gap-2">
                                <span 
                                  className={`${hasUpdatedPrice ? 'text-green-600' : 'text-gray-900'} ${canEdit ? 'cursor-pointer hover:underline' : ''}`}
                                  onClick={() => canEdit && handleEditClick(match)}
                                  title={canEdit ? 'לחץ לעריכה' : ''}
                                >
                                  ₪{displayPrice.toFixed(2)}
                                </span>
                                {hasUpdatedPrice && (
                                  <span className="text-xs text-green-600 font-semibold">(מעודכן)</span>
                                )}
                                {canEdit && !hasUpdatedPrice && (
                                  <motion.button
                                    onClick={() => handleEditClick(match)}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary-600 text-white text-xs font-semibold rounded hover:bg-primary-700 transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    title="ערוך מחיר"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </motion.button>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {match.supplierData && match.supplierData.price ? `₪${match.supplierData.price.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-gray-900 min-w-[120px]">
                          {(() => {
                            const rideId = match.ride?.rideId;
                            if (!rideId || match.priceDifference === null) return '-';
                            const ridePrice = getPrice(rideId, match.ride.price);
                            const supplierPrice = match.supplierData?.price || 0;
                            const priceDiff = Math.abs(ridePrice - supplierPrice);
                            const isRideHigher = ridePrice > supplierPrice;
                            const isRideLower = ridePrice < supplierPrice;
                            
                            // קביעת טקסט לפי הפילטר
                            let diffText = '';
                            if (statusFilter === 'price_difference') {
                              if (priceDiffFilter === 'credit' && isRideHigher) {
                                diffText = 'הפרש זכות: ';
                              } else if (priceDiffFilter === 'debit' && isRideLower) {
                                diffText = 'הפרש חובה: ';
                              }
                            }
                            
                            return (
                              <div className="flex items-center gap-1.5 justify-end">
                                {isRideHigher && (
                                  <ArrowUp className="w-4 h-4 text-green-600 flex-shrink-0" />
                                )}
                                {isRideLower && (
                                  <ArrowDown className="w-4 h-4 text-red-600 flex-shrink-0" />
                                )}
                                <span className="font-semibold">
                                  {diffText}₪{priceDiff.toFixed(2)}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-4">
                          {(() => {
                            const rideId = match.ride?.rideId;
                            
                            // עבור גט, תמיד נציג שדה הערות אם יש rideId
                            // עבור ספקים אחרים, רק אם יש הפרש מחיר
                            if (selectedSupplier === 'gett') {
                              if (!rideId) return '-';
                              return (
                                <textarea
                                  value={rideNotes.get(rideId) || ''}
                                  onChange={(e) => {
                                    if (onUpdateNote) {
                                      onUpdateNote(rideId, e.target.value);
                                    }
                                  }}
                                  placeholder="הוסף הערה..."
                                  className="w-full min-w-[200px] max-w-[300px] px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all duration-200 resize-none"
                                  rows={2}
                                />
                              );
                            }
                            
                            // עבור ספקים אחרים, רק אם יש הפרש מחיר
                            if (!rideId) return '-';
                            if (!shouldShowNotesField(match, selectedSupplier)) return '-';
                            
                            return (
                              <textarea
                                value={rideNotes.get(rideId) || ''}
                                onChange={(e) => {
                                  if (onUpdateNote) {
                                    onUpdateNote(rideId, e.target.value);
                                  }
                                }}
                                placeholder="הוסף הערה..."
                                className="w-full min-w-[200px] max-w-[300px] px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all duration-200 resize-none"
                                rows={2}
                              />
                            );
                          })()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <motion.span 
                            className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(match.status)}`}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: index * 0.02 + 0.1 }}
                          >
                            {getStatusText(match.status)}
                          </motion.span>
                        </td>
                      </>
                    )}
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </motion.div>
      
      {/* מודל התאמה ידנית */}
      {showMatchModal && selectedRideForMatch && (
        <GettMatchModal
          ride={selectedRideForMatch}
          unmatchedGettTrips={matchResults?.gett?.filter(m => m.status === 'missing_in_ride') || []}
          onMatch={onManualGettMatch}
          onClose={() => {
            setShowMatchModal(false);
            setSelectedRideForMatch(null);
          }}
          manualGettMatches={manualGettMatches}
          getEmployeeNames={getEmployeeNames}
          formatDateWithTime={formatDateWithTime}
        />
      )}
    </motion.div>
  );
});


export default AnalysisResults;
