import { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Building2, DollarSign, TrendingUp } from 'lucide-react';

const DepartmentBreakdown = memo(function DepartmentBreakdown({ departmentData }) {
  const [expandedDepartment, setExpandedDepartment] = useState(null);

  const toggleExpand = useCallback((dept) => {
    setExpandedDepartment(prev => prev === dept ? null : dept);
  }, []);

  if (!departmentData || !departmentData.totals || departmentData.totals.length === 0) {
    return (
      <motion.div 
        className="text-center py-12 text-gray-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        אין נתוני חלוקה מחלקתית. אנא טען קבצים והרץ ניתוח.
      </motion.div>
    );
  }

  const totalAmount = departmentData.totals.reduce((sum, d) => sum + d.total, 0);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.4
      }
    }),
    hover: {
      scale: 1.02,
      y: -2,
      transition: { duration: 0.2 }
    }
  };

  const departmentVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { 
      opacity: 1, 
      height: 'auto',
      transition: { duration: 0.3, ease: "easeInOut" }
    },
    exit: { 
      opacity: 0, 
      height: 0,
      transition: { duration: 0.3, ease: "easeInOut" }
    }
  };

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6">חלוקה מחלקתית</h2>
      
      {/* סיכום כללי */}
      <div className="card-modern bg-gradient-to-br from-white to-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div 
            className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={0}
            whileHover="hover"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <Building2 className="w-6 h-6 text-blue-600" />
              <div className="text-3xl font-bold text-blue-600">
                {departmentData.totals.length}
              </div>
            </div>
            <div className="text-sm font-semibold text-gray-700">סה"כ מחלקות</div>
          </motion.div>
          
          <motion.div 
            className="text-center p-6 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={1}
            whileHover="hover"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <DollarSign className="w-6 h-6 text-green-600" />
              <div className="text-3xl font-bold text-green-600">
                ₪{totalAmount.toFixed(2)}
              </div>
            </div>
            <div className="text-sm font-semibold text-gray-700">סכום כולל</div>
          </motion.div>
          
          <motion.div 
            className="text-center p-6 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={2}
            whileHover="hover"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <TrendingUp className="w-6 h-6 text-purple-600" />
              <div className="text-3xl font-bold text-purple-600">
                {departmentData.breakdown.length}
              </div>
            </div>
            <div className="text-sm font-semibold text-gray-700">סה"כ נסיעות</div>
          </motion.div>
        </div>

        {/* רשימת מחלקות */}
        <div className="space-y-3">
          {departmentData.totals.map((dept, index) => {
            const isExpanded = expandedDepartment === dept.department;
            const rides = departmentData.breakdown
              .filter(item => item.departments.some(d => d.department === dept.department))
              .map(item => ({
                ...item,
                departmentData: item.departments.find(d => d.department === dept.department)
              }));

            return (
              <motion.div 
                key={index} 
                className="border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-soft hover:shadow-lg transition-shadow duration-300"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <motion.div
                  className="bg-gradient-to-r from-gray-50 to-gray-100 p-5 flex justify-between items-center cursor-pointer hover:from-gray-100 hover:to-gray-200 transition-all duration-200"
                  onClick={() => toggleExpand(dept.department)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex-1">
                    <div className="font-bold text-lg text-gray-900 mb-1">{dept.department}</div>
                    <div className="text-sm text-gray-600 font-medium">
                      {dept.rideCount} נסיעות
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      ₪{dept.total.toFixed(2)}
                    </div>
                    <div className="text-sm font-semibold text-gray-500">
                      {((dept.total / totalAmount) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <motion.div 
                    className="mr-4 text-gray-600"
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                  </motion.div>
                </motion.div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      variants={departmentVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      <div className="p-6 bg-white border-t border-gray-200">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                              <tr>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                  קוד נסיעה
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
                                  עובדים
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                  מחיר כולל
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                  מחיר למחלקה
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                              {rides.map((item, idx) => (
                                <motion.tr 
                                  key={idx} 
                                  className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-colors duration-200"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.03 }}
                                >
                                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                    {item.rideId}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {item.ride.date}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {item.ride.source}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {item.ride.destination}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {item.departmentData.employees
                                      .map(emp => `${emp.firstName} ${emp.lastName}`)
                                      .join(', ')}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                    ₪{item.ride.price.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-bold text-blue-600">
                                    ₪{item.departmentData.price.toFixed(2)}
                                  </td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
});

export default DepartmentBreakdown;
