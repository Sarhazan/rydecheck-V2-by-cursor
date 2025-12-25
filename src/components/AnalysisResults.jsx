import { useState } from 'react';
import { getStatusText } from '../utils/rideMatcher';

export default function AnalysisResults({ matchResults, employeeMap }) {
  const [selectedSupplier, setSelectedSupplier] = useState('bontour');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // פונקציה להמרת מספרי עובדים לשמות
  const getEmployeeNames = (passengersStr) => {
    if (!passengersStr || !employeeMap) return passengersStr || '-';
    
    // אם המחרוזת מכילה רק מספרים (עם או בלי רווחים/פסיקים), נמיר אותם לשמות
    const trimmed = String(passengersStr).trim();
    
    // נסה לחלץ מספרי עובדים מהמחרוזת (מספרים שלמים, מופרדים בפסיקים או רווחים)
    const parts = trimmed.split(/[,;|\s]+/).filter(p => p.trim().length > 0);
    if (parts.length === 0) return passengersStr;
    
    const names = [];
    let foundAnyName = false;
    
    parts.forEach(part => {
      const trimmedPart = part.trim();
      // נסה לחלץ מספר שלם מהחלק
      const numberMatch = trimmedPart.match(/^\d+$/);
      if (numberMatch) {
        const employeeId = parseInt(numberMatch[0]);
        if (!isNaN(employeeId)) {
          const employee = employeeMap.get(employeeId);
          if (employee) {
            names.push(`${employee.firstName} ${employee.lastName}`.trim());
            foundAnyName = true;
          } else {
            // אם לא נמצא, נשאיר את המספר
            names.push(trimmedPart);
          }
        } else {
          names.push(trimmedPart);
        }
      } else {
        // אם זה לא רק מספר, נשאיר את הטקסט כפי שהוא
        names.push(trimmedPart);
      }
    });
    
    // אם מצאנו לפחות שם אחד, נחזיר את הרשימה עם שמות
    // אחרת, נחזיר את המחרוזת המקורית (יכול להיות שזה כבר שמות)
    return foundAnyName ? names.join(', ') : passengersStr;
  };

  const supplierNames = {
    bontour: 'בון תור',
    hori: 'חורי',
    gett: 'גט'
  };

  // מפת שמות ספקים בקובץ רייד - כל הווריאציות האפשריות
  const supplierRideNames = {
    bontour: ['בון תור', 'בוןתור', 'צוות גיל'],
    hori: ['מוניות דוד חורי', 'חורי', 'דוד חורי', 'מוניות דוד חורי בעמ'],
    gett: ['gett', 'גט', 'GETT']
  };

  // פונקציה עזר לפרסור תאריך
  const parseDateForSort = (dateStr) => {
    if (!dateStr) return null;
    
    // פורמט אפשריים: DD/MM/YYYY HH:MM, DD/MM/YYYY, YYYY-MM-DD
    let dateParts, timeParts = ['00', '00'];
    
    if (dateStr.includes(' ')) {
      // יש זמן בתוך התאריך
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
      dateParts = dateStr.split('-').reverse(); // YYYY-MM-DD -> DD/MM/YYYY
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
  };

  // פונקציה עזר להצגת תאריך ושעה
  const formatDateWithTime = (dateStr, timeStr = null) => {
    if (!dateStr) return '-';
    
    // אם יש זמן בתוך התאריך, נציג אותו
    if (dateStr.includes(' ')) {
      return dateStr;
    }
    
    // אם יש זמן נפרד, נחבר אותו לתאריך
    if (timeStr && timeStr.trim()) {
      return `${dateStr} ${timeStr.trim()}`;
    }
    
    // אחרת, רק תאריך
    return dateStr;
  };

  const getCurrentResults = () => {
    const results = matchResults[selectedSupplier] || [];
    
    let filtered = results;
    if (statusFilter !== 'all') {
      filtered = results.filter(r => r.status === statusFilter);
    }
    
    // מיון כרונולוגי לפי תאריך
    return [...filtered].sort((a, b) => {
      // נסה לקבל תאריך מהנסיעה (ride) או מספק (supplierData)
      const getDate = (match) => {
        if (match.ride && match.ride.date) {
          return match.ride.date;
        }
        if (match.supplierData && match.supplierData.date) {
          return match.supplierData.date;
        }
        return '';
      };
      
      const dateA = parseDateForSort(getDate(a));
      const dateB = parseDateForSort(getDate(b));
      
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1; // נסיעות ללא תאריך בסוף
      if (!dateB) return -1;
      
      return dateA - dateB; // מיון מהקדום למאוחר
    });
  };

  const getSummary = () => {
    const results = matchResults[selectedSupplier] || [];
    
    // סה"כ נסיעות - רק נסיעות רייד ששייכות לספק זה
    const supplierRidePatterns = supplierRideNames[selectedSupplier] || [];
    
    
    const ridesFromRideFile = results.filter(r => {
      if (!r.ride || !r.ride.supplier) return false;
      const rideSupplier = (r.ride.supplier || '').trim().toLowerCase();
      const matches = supplierRidePatterns.some(pattern => {
        const patternLower = pattern.toLowerCase();
        return rideSupplier.includes(patternLower) || 
               patternLower.includes(rideSupplier) ||
               rideSupplier === patternLower;
      });
      
      
      return matches;
    });
    const totalRides = ridesFromRideFile.length;
    
    const matched = results.filter(r => r.status === 'matched').length;
    const priceDiff = results.filter(r => r.status === 'price_difference').length;
    const missingInRide = results.filter(r => r.status === 'missing_in_ride').length;
    const missingInSupplier = results.filter(r => r.status === 'missing_in_supplier').length;
    const notMatched = results.filter(r => r.status === 'not_matched').length;
    const performedByOtherSupplier = results.filter(r => r.status === 'performed_by_other_supplier').length;
    const missing = missingInRide + missingInSupplier + notMatched;
    
    const totalPriceDiff = results
      .filter(r => r.priceDifference !== null && r.priceDifference !== undefined && r.ride !== null) // רק הפרשי מחיר כשיש נסיעת רייד
      .reduce((sum, r) => sum + r.priceDifference, 0);

    // מספר נסיעות שהספק הגיש (כל נסיעה שיש לה supplierData)
    const supplierRides = results.filter(r => r.supplierData !== null).length;

    return { totalRides, matched, priceDiff, missing, missingInRide, missingInSupplier, totalPriceDiff, supplierRides, performedByOtherSupplier };
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      'matched': 'bg-green-100 text-green-800',
      'price_difference': 'bg-yellow-100 text-yellow-800',
      'missing_in_ride': 'bg-red-100 text-red-800',
      'missing_in_supplier': 'bg-red-100 text-red-800',
      'not_matched': 'bg-orange-100 text-orange-800',
      'performed_by_other_supplier': 'bg-purple-100 text-purple-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  const currentResults = getCurrentResults();
  const summary = getSummary();

  if (!matchResults || Object.keys(matchResults).length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        אין תוצאות להצגה. אנא טען קבצים והרץ ניתוח.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* בחירת ספק */}
      <div className="flex gap-2 border-b">
        {Object.keys(supplierNames).map(supplier => (
          <button
            key={supplier}
            onClick={() => setSelectedSupplier(supplier)}
            className={`px-4 py-2 font-medium ${
              selectedSupplier === supplier
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {supplierNames[supplier]}
          </button>
        ))}
      </div>

      {/* סיכום */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
        <div className="space-y-2">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">סה"כ נסיעות (רייד)</div>
            <div className="text-2xl font-bold">{summary.totalRides}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">נסיעות ספק</div>
            <div className="text-2xl font-bold text-gray-700">{summary.supplierRides}</div>
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">תואמים</div>
          <div className="text-2xl font-bold text-green-600">{summary.matched}</div>
        </div>
        {selectedSupplier !== 'gett' && (
          <div className="bg-yellow-50 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">הפרש מחיר</div>
            <div className="text-2xl font-bold text-yellow-600">{summary.priceDiff}</div>
          </div>
        )}
        <div className="bg-red-50 p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">חסר ברייד</div>
          <div className="text-2xl font-bold text-red-600">{summary.missingInRide || 0}</div>
        </div>
        {selectedSupplier === 'gett' ? (
          <div className="bg-purple-50 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">בוצע על ידי ספק אחר</div>
            <div className="text-2xl font-bold text-purple-600">{summary.performedByOtherSupplier || 0}</div>
          </div>
        ) : (
          <div className="bg-orange-50 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">קיים ברייד חסר אצל הספק</div>
            <div className="text-2xl font-bold text-orange-600">{summary.missingInSupplier || 0}</div>
          </div>
        )}
        {selectedSupplier === 'gett' ? (
          <>
            <div className="bg-blue-50 p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">סכום הפרשי מחיר</div>
              <div className="text-2xl font-bold text-blue-600">
                ₪{summary.totalPriceDiff.toFixed(2)}
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">קיים ברייד חסר אצל הספק</div>
              <div className="text-2xl font-bold text-orange-600">{summary.missingInSupplier || 0}</div>
            </div>
          </>
        ) : (
          <div className="bg-blue-50 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">סכום הפרשי מחיר</div>
            <div className="text-2xl font-bold text-blue-600">
              ₪{summary.totalPriceDiff.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* סינון */}
      <div className="flex gap-2 items-center">
        <label className="text-sm font-medium">סינון לפי סטטוס:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-1"
        >
          <option value="all">הכל</option>
          <option value="matched">תואם</option>
          <option value="price_difference">הפרש מחיר</option>
          <option value="missing_in_ride">חסר ברייד</option>
          <option value="missing_in_supplier">חסר בספק</option>
        </select>
      </div>

      {/* טבלה */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {statusFilter === 'missing_in_ride' || statusFilter === 'performed_by_other_supplier' ? (
                // עמודות עבור "חסר ברייד" או "בוצע על ידי ספק אחר" - רק נתוני ספק
                <>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    מספר הזמנה
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    תאריך
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    מקור (ספק)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    יעד (ספק)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    שמות עובדים (ספק)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    מחיר ספק
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    סטטוס
                  </th>
                </>
              ) : statusFilter === 'missing_in_supplier' ? (
                // עמודות עבור "חסר בספק" - רק נתוני רייד (ללא מחיר ספק והפרש)
                <>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    קוד נסיעה
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    תאריך
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    מקור
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    יעד
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    מחיר רייד
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    סטטוס
                  </th>
                </>
              ) : (
                // עמודות רגילות - נתוני רייד וספק
                <>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    קוד נסיעה / מספר הזמנה
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    תאריך
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    מקור
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    יעד
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    שמות עובדים
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    מחיר רייד
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    מחיר ספק
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    הפרש
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    סטטוס
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentResults.length === 0 ? (
              <tr>
                <td colSpan={
                  statusFilter === 'missing_in_ride' || statusFilter === 'performed_by_other_supplier' ? 7 : 
                  statusFilter === 'missing_in_supplier' ? 7 : 
                  9
                } className="px-4 py-8 text-center text-gray-500">
                  אין תוצאות
                </td>
              </tr>
            ) : (
              currentResults.map((match, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {statusFilter === 'missing_in_ride' || statusFilter === 'performed_by_other_supplier' ? (
                    // שורות עבור "חסר ברייד" או "בוצע על ידי ספק אחר" - רק נתוני ספק
                    <>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {match.supplierData ? match.supplierData.orderNumber : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {match.supplierData ? formatDateWithTime(match.supplierData.date, match.supplierData.time) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {match.supplierData && match.supplierData.source ? match.supplierData.source : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {match.supplierData && match.supplierData.destination ? match.supplierData.destination : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {match.supplierData ? getEmployeeNames(match.supplierData.passengers) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {match.supplierData ? `₪${match.supplierData.price.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(match.status)}`}>
                          {getStatusText(match.status)}
                        </span>
                      </td>
                    </>
                  ) : statusFilter === 'missing_in_supplier' ? (
                    // שורות עבור "חסר בספק" - רק נתוני רייד (ללא מחיר ספק והפרש)
                    <>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {match.ride ? match.ride.rideId : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {match.ride ? formatDateWithTime(match.ride.date) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {match.ride ? match.ride.source : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {match.ride ? match.ride.destination : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {match.ride && match.ride.passengers ? getEmployeeNames(match.ride.passengers) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {match.ride ? `₪${match.ride.price.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(match.status)}`}>
                          {getStatusText(match.status)}
                        </span>
                      </td>
                    </>
                  ) : (
                    // שורות רגילות - נתוני רייד וספק
                    <>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {match.ride ? match.ride.rideId : (match.supplierData && match.supplierData.orderNumber ? match.supplierData.orderNumber : '-')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {match.ride ? formatDateWithTime(match.ride.date) : (match.supplierData && match.supplierData.date ? formatDateWithTime(match.supplierData.date, match.supplierData.time) : '-')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {match.ride ? (match.ride.source || '-') : (match.supplierData && match.supplierData.source ? match.supplierData.source : '-')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {match.ride ? (match.ride.destination || '-') : (match.supplierData && match.supplierData.destination ? match.supplierData.destination : '-')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {match.ride && match.ride.passengers ? getEmployeeNames(match.ride.passengers) : (match.supplierData && match.supplierData.passengers ? getEmployeeNames(match.supplierData.passengers) : '-')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {match.ride ? `₪${match.ride.price.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {match.supplierData && match.supplierData.price ? `₪${match.supplierData.price.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {match.priceDifference !== null && match.ride !== null ? `₪${match.priceDifference.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(match.status)}`}>
                          {getStatusText(match.status)}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
