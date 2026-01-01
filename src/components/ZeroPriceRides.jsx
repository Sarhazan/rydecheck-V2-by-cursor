// React
import { memo, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

// Framer Motion
import { motion, AnimatePresence } from 'framer-motion';

// Icons
import { AlertTriangle, Edit2, Check, X } from 'lucide-react';

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
  tripsRemovedFromReview = new Set()
}) {
  const [activeTab, setActiveTab] = useState('zeroPrice');
  const [editingRideId, setEditingRideId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');

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

  // סינון נסיעות עם נוסע 55555
  const ridesWith55555 = useMemo(() => {
    return rides.filter(ride => {
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
  }, [rides]);

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
  if (zeroPriceRides.length === 0 && ridesWith55555.length === 0) {
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

  // בחירת הנסיעות לפי הטאב הפעיל
  const currentRides = activeTab === 'zeroPrice' ? filteredZeroPriceRides : ridesWith55555;
  const currentCount = activeTab === 'zeroPrice' ? filteredZeroPriceRides.length : ridesWith55555.length;

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

        {/* טבלה */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-yellow-100 to-orange-100">
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-800 border-b-2 border-yellow-300">
                  מספר נסיעה
                </th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-800 border-b-2 border-yellow-300">
                  תאריך
                </th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-800 border-b-2 border-yellow-300">
                  מוצא
                </th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-800 border-b-2 border-yellow-300">
                  יעד
                </th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-800 border-b-2 border-yellow-300">
                  נוסעים
                </th>
                {activeTab === 'passenger55555' && (
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-800 border-b-2 border-yellow-300">
                    שייך למחלקה
                  </th>
                )}
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-800 border-b-2 border-yellow-300">
                  ספק
                </th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-800 border-b-2 border-yellow-300">
                  מחיר
                </th>
              </tr>
            </thead>
            <tbody>
              {currentRides.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'passenger55555' ? 8 : 7} className="px-6 py-8 text-center text-gray-500">
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
                        {parseDate(ride.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {ride.source || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {ride.destination || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {ride.passengers || getEmployeeNames(ride.pids) || '-'}
                      </td>
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
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {ride.supplier || '-'}
                      </td>
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
  tripsRemovedFromReview: PropTypes.instanceOf(Set)
};

ZeroPriceRides.defaultProps = {
  employeeMap: new Map(),
  onUpdatePrice: null,
  updatedPrices: new Map(),
  passenger55555Departments: new Map(),
  onUpdatePassenger55555Department: null,
  tripsRemovedFromReview: new Set()
};

export default ZeroPriceRides;

