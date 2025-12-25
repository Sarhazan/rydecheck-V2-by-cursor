import { useState } from 'react';

export default function DepartmentBreakdown({ departmentData }) {
  const [expandedDepartment, setExpandedDepartment] = useState(null);

  if (!departmentData || !departmentData.totals || departmentData.totals.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        אין נתוני חלוקה מחלקתית. אנא טען קבצים והרץ ניתוח.
      </div>
    );
  }

  const toggleExpand = (dept) => {
    setExpandedDepartment(expandedDepartment === dept ? null : dept);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">חלוקה מחלקתית</h2>
      
      {/* סיכום כללי */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {departmentData.totals.length}
            </div>
            <div className="text-sm text-gray-600">סה"כ מחלקות</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              ₪{departmentData.totals.reduce((sum, d) => sum + d.total, 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">סכום כולל</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {departmentData.breakdown.length}
            </div>
            <div className="text-sm text-gray-600">סה"כ נסיעות</div>
          </div>
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
              <div key={index} className="border rounded-lg overflow-hidden">
                <div
                  className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleExpand(dept.department)}
                >
                  <div className="flex-1">
                    <div className="font-medium text-lg">{dept.department}</div>
                    <div className="text-sm text-gray-600">
                      {dept.rideCount} נסיעות
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      ₪{dept.total.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {((dept.total / departmentData.totals.reduce((sum, d) => sum + d.total, 0)) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="mr-4">
                    {isExpanded ? '▼' : '▶'}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 bg-white border-t">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                              קוד נסיעה
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                              תאריך
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                              מקור
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                              יעד
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                              עובדים
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                              מחיר כולל
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                              מחיר למחלקה
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {rides.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {item.rideId}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {item.ride.date}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {item.ride.source}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {item.ride.destination}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {item.departmentData.employees
                                  .map(emp => `${emp.firstName} ${emp.lastName}`)
                                  .join(', ')}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                ₪{item.ride.price.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-sm font-medium text-blue-600">
                                ₪{item.departmentData.price.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
