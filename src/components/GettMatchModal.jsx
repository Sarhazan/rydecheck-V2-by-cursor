// React
import { useCallback, useMemo } from 'react';

// Framer Motion
import { motion, AnimatePresence } from 'framer-motion';

// Icons
import { XCircle, CheckCircle2 } from 'lucide-react';

/**
 * קומפוננטת מודל לבחירת נסיעת גט להתאמה
 * @param {Object} ride - נסיעת רייד להתאמה
 * @param {Array} unmatchedGettTrips - מערך של נסיעות גט שלא הותאמו
 * @param {Function} onMatch - פונקציה להתאמה (rideId, gettOrderNumber)
 * @param {Function} onClose - פונקציה לסגירת המודל
 * @param {Map} manualGettMatches - מפה של התאמות ידניות קיימות
 * @param {Function} getEmployeeNames - פונקציה לקבלת שמות עובדים
 * @param {Function} formatDateWithTime - פונקציה לעיצוב תאריך ושעה
 */
export default function GettMatchModal({ 
  ride, 
  unmatchedGettTrips, 
  onMatch, 
  onClose, 
  manualGettMatches, 
  getEmployeeNames, 
  formatDateWithTime 
}) {
  /**
   * פונקציה לפרסור תאריך למיון
   * @param {string} dateStr - מחרוזת תאריך
   * @param {string} timeStr - מחרוזת שעה (אופציונלי)
   * @returns {Date|null} תאריך ושעה או null אם לא ניתן לפרסר
   */
  const parseDateForSort = useCallback((dateStr, timeStr = '') => {
    if (!dateStr) return null;
    
    let dateParts, timeParts = ['00', '00'];
    const fullDateStr = timeStr ? `${dateStr} ${timeStr}` : dateStr;
    
    if (fullDateStr.includes(' ')) {
      const parts = fullDateStr.split(' ');
      dateStr = parts[0];
      const timeStrPart = parts[1] || '';
      if (timeStrPart) {
        timeParts = timeStrPart.split(':');
      }
    }
    
    if (dateStr.includes('/')) {
      dateParts = dateStr.split('/');
    } else if (dateStr.includes('-')) {
      // פורמט YYYY-MM-DD
      dateParts = dateStr.split('-');
      if (dateParts.length === 3) {
        // אם זה YYYY-MM-DD, נהפוך ל-DD/MM/YYYY
        dateParts = [dateParts[2], dateParts[1], dateParts[0]];
      }
    } else {
      return null;
    }
    
    if (dateParts.length < 3) return null;
    
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const year = parseInt(dateParts[2], 10);
    const hour = parseInt(timeParts[0] || '0', 10);
    const minute = parseInt(timeParts[1] || '0', 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    
    return new Date(year, month, day, hour, minute);
  }, []);

  /**
   * מיון נסיעות לפי תאריך בסדר כרונולוגי (מתחילת החודש לסופו)
   */
  const sortedGettTrips = useMemo(() => {
    return [...unmatchedGettTrips].sort((a, b) => {
      const dateA = parseDateForSort(a.supplierData?.date, a.supplierData?.time);
      const dateB = parseDateForSort(b.supplierData?.date, b.supplierData?.time);
      
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      return dateA.getTime() - dateB.getTime();
    });
  }, [unmatchedGettTrips, parseDateForSort]);

  /**
   * טיפול בהתאמה של נסיעת גט
   * @param {Object} gettTrip - נסיעת גט להתאמה
   */
  const handleMatch = useCallback((gettTrip) => {
    const gettOrderNumber = gettTrip.supplierData?.orderNumber || gettTrip.supplierData?.orderId;
    if (gettOrderNumber && ride?.rideId) {
      onMatch(ride.rideId, gettOrderNumber);
      onClose();
    }
  }, [ride, onMatch, onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">בחר נסיעת גט להתאמה</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="text-sm text-gray-700">
              <span className="font-semibold">נסיעת רייד:</span> {ride?.rideId} - {ride?.source} → {ride?.destination}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {sortedGettTrips.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                אין נסיעות גט שלא הותאמו
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      מספר הזמנה
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      תאריך
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      מקור
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      יעד
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      מחיר
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      נוסעים
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      פעולה
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedGettTrips.map((gettTrip, index) => {
                    const gettOrderNumber = gettTrip.supplierData?.orderNumber || gettTrip.supplierData?.orderId;
                    const isAlreadyMatched = Array.from(manualGettMatches.values()).includes(gettOrderNumber);
                    
                    return (
                      <motion.tr
                        key={gettOrderNumber || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {gettOrderNumber || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDateWithTime(gettTrip.supplierData?.date, gettTrip.supplierData?.time)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {gettTrip.supplierData?.source || '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {gettTrip.supplierData?.destination || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {gettTrip.supplierData?.price !== undefined ? `₪${gettTrip.supplierData.price.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          <div className="flex flex-col gap-1">
                            {getEmployeeNames(gettTrip.supplierData?.passengers)}
                            {gettTrip.supplierData?.price === 28 && (
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
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {isAlreadyMatched ? (
                              <motion.span
                                className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                              >
                                <CheckCircle2 className="w-3 h-3 ml-1" />
                                הותאמה
                              </motion.span>
                            ) : (
                              <motion.button
                                onClick={() => handleMatch(gettTrip)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                התאם
                              </motion.button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
            <motion.button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ביטול
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

