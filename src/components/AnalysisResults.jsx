// React
import { useState, useMemo, useCallback, memo } from 'react';

// Framer Motion
import { motion, AnimatePresence } from 'framer-motion';

// Utils
import { getStatusText } from '../utils/rideMatcher';

// Icons
import { CheckCircle2, AlertCircle, XCircle, TrendingUp, DollarSign, Users, FileX, ArrowRightLeft } from 'lucide-react';

const AnalysisResults = memo(function AnalysisResults({ matchResults, employeeMap }) {
  const [selectedSupplier, setSelectedSupplier] = useState('bontour');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const supplierNames = {
    bontour: 'בון תור',
    hori: 'חורי',
    gett: 'גט'
  };

  const supplierRideNames = {
    bontour: ['בון תור', 'בוןתור', 'צוות גיל'],
    hori: ['מוניות דוד חורי', 'חורי', 'דוד חורי', 'מוניות דוד חורי בעמ'],
    gett: ['gett', 'גט', 'GETT']
  };

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

  const currentResults = useMemo(() => {
    const results = matchResults[selectedSupplier] || [];
    
    let filtered = results;
    if (statusFilter !== 'all') {
      // עבור גט: פילטר "הפרש מחיר" צריך להציג נסיעות מתואמות שיש להן הפרש מחיר
      if (selectedSupplier === 'gett' && statusFilter === 'price_difference') {
        filtered = results.filter(r => r.status === 'matched' && r.priceDifference !== null && r.priceDifference !== undefined && r.priceDifference > 0.01);
      } else {
        filtered = results.filter(r => r.status === statusFilter);
      }
    }
    
    return [...filtered].sort((a, b) => {
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
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      return dateA - dateB;
    });
  }, [matchResults, selectedSupplier, statusFilter, parseDateForSort]);

  const summary = useMemo(() => {
    const results = matchResults[selectedSupplier] || [];
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
    // עבור גט: הפרשי מחיר הם נסיעות מתואמות שיש להן הפרש מחיר (לא סטטוס נפרד)
    const priceDiff = selectedSupplier === 'gett' 
      ? results.filter(r => r.status === 'matched' && r.priceDifference !== null && r.priceDifference !== undefined && r.priceDifference > 0.01).length
      : results.filter(r => r.status === 'price_difference').length;
    const missingInRide = results.filter(r => r.status === 'missing_in_ride').length;
    const missingInSupplier = results.filter(r => r.status === 'missing_in_supplier').length;
    const notMatched = results.filter(r => r.status === 'not_matched').length;
    const performedByOtherSupplier = results.filter(r => r.status === 'performed_by_other_supplier').length;
    const missing = missingInRide + missingInSupplier + notMatched;
    
    const totalPriceDiff = results
      .filter(r => r.priceDifference !== null && r.priceDifference !== undefined && r.ride !== null)
      .reduce((sum, r) => sum + r.priceDifference, 0);

    const supplierRides = results.filter(r => r.supplierData !== null).length;

    return { totalRides, matched, priceDiff, missing, missingInRide, missingInSupplier, totalPriceDiff, supplierRides, performedByOtherSupplier };
  }, [matchResults, selectedSupplier]);

  const getStatusBadgeClass = useCallback((status) => {
    const classes = {
      'matched': 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200',
      'price_difference': 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border border-yellow-200',
      'missing_in_ride': 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200',
      'missing_in_supplier': 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200',
      'not_matched': 'bg-gradient-to-r from-orange-100 to-orange-50 text-orange-800 border border-orange-200',
      'performed_by_other_supplier': 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 border border-purple-200'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }, []);

  const handleSupplierChange = useCallback((supplier) => {
    setSelectedSupplier(supplier);
  }, []);

  const handleFilterChange = useCallback((e) => {
    setStatusFilter(e.target.value);
  }, []);

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
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
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
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <div className="text-sm text-gray-700 font-medium">תואמים</div>
          </div>
          <div className="text-3xl font-bold text-green-600">{summary.matched}</div>
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
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-yellow-600" />
              <div className="text-sm text-gray-700 font-medium">הפרש מחיר</div>
            </div>
            <div className="text-3xl font-bold text-yellow-600">{summary.priceDiff}</div>
          </motion.div>
        )}
        
        <motion.div 
          className="card-modern bg-gradient-to-br from-red-50 to-red-100 border border-red-200"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={selectedSupplier !== 'gett' ? 3 : 2}
          whileHover="hover"
        >
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <div className="text-sm text-gray-700 font-medium">חסר ברייד</div>
          </div>
          <div className="text-3xl font-bold text-red-600">{summary.missingInRide || 0}</div>
        </motion.div>
        
        {selectedSupplier === 'gett' ? (
          <motion.div 
            className="card-modern bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={3}
            whileHover="hover"
          >
            <div className="flex items-center gap-2 mb-2">
              <ArrowRightLeft className="w-5 h-5 text-purple-600" />
              <div className="text-sm text-gray-700 font-medium">בוצע על ידי ספק אחר</div>
            </div>
            <div className="text-3xl font-bold text-purple-600">{summary.performedByOtherSupplier || 0}</div>
          </motion.div>
        ) : (
          <motion.div 
            className="card-modern bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={4}
            whileHover="hover"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <div className="text-sm text-gray-700 font-medium">קיים ברייד חסר אצל הספק</div>
            </div>
            <div className="text-3xl font-bold text-orange-600">{summary.missingInSupplier || 0}</div>
          </motion.div>
        )}
        
        {selectedSupplier === 'gett' ? (
          <>
            <motion.div 
              className="card-modern bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={4}
              whileHover="hover"
            >
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <div className="text-sm text-gray-700 font-medium">סכום הפרשי מחיר</div>
              </div>
              <div className="text-3xl font-bold text-blue-600">
                ₪{summary.totalPriceDiff.toFixed(2)}
              </div>
            </motion.div>
            <motion.div 
              className="card-modern bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={5}
              whileHover="hover"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <div className="text-sm text-gray-700 font-medium">קיים ברייד חסר אצל הספק</div>
              </div>
              <div className="text-3xl font-bold text-orange-600">{summary.missingInSupplier || 0}</div>
            </motion.div>
          </>
        ) : (
          <motion.div 
            className="card-modern bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={5}
            whileHover="hover"
          >
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <div className="text-sm text-gray-700 font-medium">סכום הפרשי מחיר</div>
            </div>
            <div className="text-3xl font-bold text-blue-600">
              ₪{summary.totalPriceDiff.toFixed(2)}
            </div>
          </motion.div>
        )}
      </div>

      {/* סינון */}
      <motion.div 
        className="flex gap-2 items-center"
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
          <option value="missing_in_supplier">חסר בספק</option>
        </select>
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
              {statusFilter === 'missing_in_ride' || statusFilter === 'performed_by_other_supplier' ? (
                <>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    מספר הזמנה
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
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    שמות עובדים (ספק)
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    מחיר ספק
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    סטטוס
                  </th>
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
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    מחיר רייד
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    סטטוס
                  </th>
                </>
              ) : (
                <>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    קוד נסיעה / מספר הזמנה
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
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    שמות עובדים
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    מחיר רייד
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    מחיר ספק
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    הפרש
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
                    statusFilter === 'missing_in_ride' || statusFilter === 'performed_by_other_supplier' ? 7 : 
                    statusFilter === 'missing_in_supplier' ? 6 : 
                    9
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
                    {statusFilter === 'missing_in_ride' || statusFilter === 'performed_by_other_supplier' ? (
                      <>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {match.supplierData ? match.supplierData.orderNumber : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {match.supplierData ? formatDateWithTime(match.supplierData.date, match.supplierData.time) : '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {match.supplierData && match.supplierData.source ? match.supplierData.source : '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {match.supplierData && match.supplierData.destination ? match.supplierData.destination : '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {match.supplierData ? getEmployeeNames(match.supplierData.passengers) : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {match.supplierData ? `₪${match.supplierData.price.toFixed(2)}` : '-'}
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
                    ) : statusFilter === 'missing_in_supplier' ? (
                      <>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {match.ride ? match.ride.rideId : '-'}
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
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {match.ride ? `₪${match.ride.price.toFixed(2)}` : '-'}
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
                    ) : (
                      <>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {match.ride ? match.ride.rideId : (match.supplierData && match.supplierData.orderNumber ? match.supplierData.orderNumber : '-')}
                        </td>
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
                          {match.ride && match.ride.passengers ? getEmployeeNames(match.ride.passengers) : (match.supplierData && match.supplierData.passengers ? getEmployeeNames(match.supplierData.passengers) : '-')}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {match.ride ? `₪${match.ride.price.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {match.supplierData && match.supplierData.price ? `₪${match.supplierData.price.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {match.priceDifference !== null && match.ride !== null ? `₪${match.priceDifference.toFixed(2)}` : '-'}
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
    </motion.div>
  );
});

export default AnalysisResults;
