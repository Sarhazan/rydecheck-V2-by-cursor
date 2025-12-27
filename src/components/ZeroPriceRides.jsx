// React
import { memo, useMemo, useState } from 'react';

// Framer Motion
import { motion } from 'framer-motion';

// Icons
import { AlertTriangle } from 'lucide-react';

/**
 * קומפוננטה להצגת נסיעות לבדיקה (מחיר אפס או נוסע 55555)
 * @param {Object} props - Props של הקומפוננטה
 * @param {Array} props.rides - מערך של נסיעות
 * @param {Map} props.employeeMap - מפה של עובדים
 */
const ZeroPriceRides = memo(function ZeroPriceRides({ rides, employeeMap }) {
  const [activeTab, setActiveTab] = useState('zeroPrice');

  // סינון נסיעות עם מחיר אפס
  const zeroPriceRides = useMemo(() => {
    return rides.filter(ride => !ride.price || ride.price === 0);
  }, [rides]);

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
  const currentRides = activeTab === 'zeroPrice' ? zeroPriceRides : ridesWith55555;
  const currentCount = activeTab === 'zeroPrice' ? zeroPriceRides.length : ridesWith55555.length;

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
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    אין נסיעות בקטגוריה זו
                  </td>
                </tr>
              ) : (
                currentRides.map((ride, index) => (
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
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {ride.supplier || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-red-600">
                      ₪{ride.price?.toFixed(2) || '0.00'}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
});

export default ZeroPriceRides;

