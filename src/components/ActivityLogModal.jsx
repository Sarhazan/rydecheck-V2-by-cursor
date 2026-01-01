// React
import { useMemo } from 'react';

// Framer Motion
import { motion, AnimatePresence } from 'framer-motion';

// Icons
import { XCircle, Trash2, Plus, DollarSign, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * קומפוננטת מודל להצגת לוג פעולות
 * @param {boolean} isOpen - האם המודל פתוח
 * @param {Function} onClose - פונקציה לסגירת המודל
 * @param {Array} activityLogs - מערך של פעולות
 */
export default function ActivityLogModal({ isOpen, onClose, activityLogs = [] }) {
  /**
   * פורמט תאריך ושעה
   */
  const formatDateTime = useMemo(() => {
    return (timestamp) => {
      const date = new Date(timestamp);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    };
  }, []);

  /**
   * קבלת טקסט וצבע לסוג פעולה
   */
  const getActivityTypeInfo = useMemo(() => {
    return (type) => {
      switch (type) {
        case 'ride_removed':
          return {
            text: 'הסרת נסיעה',
            color: 'bg-red-100 text-red-800 border-red-200',
            icon: Trash2
          };
        case 'ride_added':
          return {
            text: 'הוספת נסיעה',
            color: 'bg-green-100 text-green-800 border-green-200',
            icon: Plus
          };
        case 'price_updated':
          return {
            text: 'עדכון מחיר',
            color: 'bg-blue-100 text-blue-800 border-blue-200',
            icon: DollarSign
          };
        default:
          return {
            text: 'פעולה',
            color: 'bg-gray-100 text-gray-800 border-gray-200',
            icon: null
          };
      }
    };
  }, []);

  /**
   * מיון הפעולות לפי תאריך (החדש ביותר ראשון)
   */
  const sortedLogs = useMemo(() => {
    return [...activityLogs].sort((a, b) => b.timestamp - a.timestamp);
  }, [activityLogs]);

  if (!isOpen) return null;

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
          className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* כותרת */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">לוג פעולות</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {/* תוכן */}
          <div className="flex-1 overflow-y-auto">
            {sortedLogs.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                אין פעולות לוג
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      תאריך/שעה
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      סוג פעולה
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      קוד נסיעה
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      מקור
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      יעד
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      תאריך נסיעה
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      מחיר
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      ספק
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      פרטי פעולה
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedLogs.map((log, index) => {
                    const typeInfo = getActivityTypeInfo(log.type);
                    const Icon = typeInfo.icon;

                    return (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${typeInfo.color}`}>
                            {Icon && <Icon className="w-3 h-3 ml-1" />}
                            {typeInfo.text}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {log.rideId}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {log.rideData?.source || '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {log.rideData?.destination || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.rideData?.date || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.rideData?.price ? `₪${log.rideData.price.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {log.actionDetails?.supplier || '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {log.type === 'price_updated' && log.actionDetails?.oldPrice !== undefined && log.actionDetails?.newPrice !== undefined ? (
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-1">
                                <span className="font-semibold">₪{log.actionDetails.newPrice.toFixed(2)}</span>
                                {log.actionDetails.newPrice > log.actionDetails.oldPrice && (
                                  <ArrowUp className="w-4 h-4 text-green-600 flex-shrink-0" />
                                )}
                                {log.actionDetails.newPrice < log.actionDetails.oldPrice && (
                                  <ArrowDown className="w-4 h-4 text-red-600 flex-shrink-0" />
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                ₪{log.actionDetails.oldPrice.toFixed(2)}
                              </div>
                            </div>
                          ) : log.type === 'ride_added' ? (
                            <span>נוספה נסיעה חדשה</span>
                          ) : log.type === 'ride_removed' ? (
                            <span>הוסרה מהרייד</span>
                          ) : (
                            '-'
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* תחתית */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              סה"כ פעולות: {sortedLogs.length}
            </div>
            <motion.button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              סגור
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
