// React
import { useState, useCallback, memo } from 'react';

// Framer Motion
import { motion, AnimatePresence } from 'framer-motion';

// Icons
import { ChevronDown, ChevronUp, Building2, DollarSign, TrendingUp, RefreshCw } from 'lucide-react';

const DepartmentBreakdown = memo(function DepartmentBreakdown({ departmentData, employeeMap, onUpdateDepartmentData }) {
  const [expandedDepartment, setExpandedDepartment] = useState(null);
  const [employeeDepartmentAssignments, setEmployeeDepartmentAssignments] = useState(new Map());

  const toggleExpand = useCallback((dept) => {
    setExpandedDepartment(prev => prev === dept ? null : dept);
  }, []);
  
  const handleDepartmentChange = useCallback((employeeId, newDepartment, rideId) => {
    setEmployeeDepartmentAssignments(prev => {
      const newMap = new Map(prev);
      // אם employeeId הוא null, זה אומר שזה שיוך של הנסיעה כולה (ללא PIDs)
      const key = employeeId === null ? `ride-${rideId}` : `${rideId}-${employeeId}`;
      newMap.set(key, newDepartment);
      return newMap;
    });
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
  
  // קבלת רשימת כל המחלקות (למעט "ללא מחלקה")
  const allDepartments = departmentData.totals
    .filter(d => d.department !== 'ללא מחלקה')
    .map(d => d.department)
    .sort();

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

            const isNoDepartment = dept.department === 'ללא מחלקה';
            
            return (
              <motion.div 
                key={index} 
                className={`border-2 rounded-xl overflow-hidden shadow-soft hover:shadow-lg transition-shadow duration-300 ${
                  isNoDepartment 
                    ? 'border-red-400 bg-gradient-to-br from-red-50 to-red-100' 
                    : 'border-gray-200 bg-white'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <motion.div
                  className={`p-5 flex justify-between items-center cursor-pointer transition-all duration-200 ${
                    isNoDepartment
                      ? 'bg-gradient-to-r from-red-100 to-red-200 hover:from-red-200 hover:to-red-300'
                      : 'bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200'
                  }`}
                  onClick={() => toggleExpand(dept.department)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex-1">
                    <div className={`font-bold text-lg mb-1 ${isNoDepartment ? 'text-red-900' : 'text-gray-900'}`}>
                      {dept.department}
                    </div>
                    <div className={`text-sm font-medium ${isNoDepartment ? 'text-red-700' : 'text-gray-600'}`}>
                      {dept.rideCount} נסיעות
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className={`text-3xl font-bold ${
                      isNoDepartment 
                        ? 'text-red-700' 
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'
                    }`}>
                      ₪{dept.total.toFixed(2)}
                    </div>
                    <div className={`text-sm font-semibold ${isNoDepartment ? 'text-red-600' : 'text-gray-500'}`}>
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
                                  {isNoDepartment ? 'עובדים / שיוך למחלקה' : 'עובדים'}
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
                                    {isNoDepartment ? (
                                      // עבור "ללא מחלקה" - תמיד מציג dropdown, גם אם אין PIDs
                                      item.ride.pids && item.ride.pids.length > 0 ? (
                                        <div className="space-y-2">
                                          {item.ride.pids.map((pid, pidIdx) => {
                                            const employee = employeeMap?.get(pid);
                                            const employeeName = employee 
                                              ? `${employee.firstName} ${employee.lastName}` 
                                              : `PID: ${pid}`;
                                            const assignedDept = employeeDepartmentAssignments.get(`${item.rideId}-${pid}`);
                                            
                                            return (
                                              <div key={pidIdx} className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-medium">{employeeName}:</span>
                                                <select
                                                  value={assignedDept || ''}
                                                  onChange={(e) => handleDepartmentChange(pid, e.target.value, item.rideId)}
                                                  className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 min-w-[150px]"
                                                >
                                                  <option value="">בחר מחלקה...</option>
                                                  {allDepartments.map(deptName => (
                                                    <option key={deptName} value={deptName}>{deptName}</option>
                                                  ))}
                                                </select>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        // אם אין PIDs, מציג dropdown כללי לשיוך הנסיעה למחלקה
                                        <div className="space-y-2">
                                          <div className="text-xs text-gray-600 mb-2">
                                            אין PIDs לנסיעה זו - ניתן לשייך את הנסיעה למחלקה:
                                          </div>
                                          <select
                                            value={employeeDepartmentAssignments.get(`ride-${item.rideId}`) || ''}
                                            onChange={(e) => handleDepartmentChange(null, e.target.value, item.rideId)}
                                            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 min-w-[150px]"
                                          >
                                            <option value="">בחר מחלקה...</option>
                                            {allDepartments.map(deptName => (
                                              <option key={deptName} value={deptName}>{deptName}</option>
                                            ))}
                                          </select>
                                        </div>
                                      )
                                    ) : (
                                      // עבור מחלקות אחרות - מציג את העובדים
                                      item.departmentData.employees && item.departmentData.employees.length > 0
                                        ? item.departmentData.employees
                                            .map(emp => `${emp.firstName} ${emp.lastName}`)
                                            .join(', ')
                                        : '-'
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                    ₪{item.ride.price.toFixed(2)}
                                  </td>
                                  <td className={`px-4 py-3 text-sm font-bold ${isNoDepartment ? 'text-red-600' : 'text-blue-600'}`}>
                                    ₪{item.departmentData.price.toFixed(2)}
                                  </td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {isNoDepartment && employeeDepartmentAssignments.size > 0 && (
                          <div className="mt-4 flex justify-end border-t border-gray-200 pt-4">
                            <motion.button
                              onClick={() => {
                                if (onUpdateDepartmentData) {
                                  onUpdateDepartmentData(employeeDepartmentAssignments);
                                  setEmployeeDepartmentAssignments(new Map());
                                }
                              }}
                              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg shadow-lg hover:shadow-xl font-semibold transition-all duration-200"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <RefreshCw className="w-4 h-4" />
                              עדכן נתונים
                            </motion.button>
                          </div>
                        )}
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
