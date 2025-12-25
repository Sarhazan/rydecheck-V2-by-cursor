/**
 * חישוב חלוקה מחלקתית לכל נסיעה
 */
export function calculateDepartmentBreakdown(rides, employeeMap) {
  const departmentBreakdown = [];
  const departmentTotals = new Map();
  
  rides.forEach(ride => {
    if (!ride.pids || ride.pids.length === 0) {
      // אין עובדים - אין חלוקה
      return;
    }
    
    // קיבוץ עובדים לפי מחלקה
    const employeesByDepartment = new Map();
    
    ride.pids.forEach(pid => {
      const employee = employeeMap.get(pid);
      if (employee && employee.department) {
        const dept = employee.department;
        if (!employeesByDepartment.has(dept)) {
          employeesByDepartment.set(dept, []);
        }
        employeesByDepartment.get(dept).push(employee);
      }
    });
    
    // חישוב מחיר לכל מחלקה
    const totalPassengers = ride.pids.length;
    const departmentPrices = new Map();
    
    employeesByDepartment.forEach((employees, department) => {
      const departmentPassengerCount = employees.length;
      const departmentPrice = (departmentPassengerCount / totalPassengers) * ride.price;
      
      departmentPrices.set(department, {
        price: departmentPrice,
        passengerCount: departmentPassengerCount,
        employees: employees
      });
      
      // עדכון סה"כ מחלקתי
      if (!departmentTotals.has(department)) {
        departmentTotals.set(department, 0);
      }
      departmentTotals.set(department, departmentTotals.get(department) + departmentPrice);
    });
    
    // שמירת חלוקה לכל נסיעה
    departmentBreakdown.push({
      rideId: ride.rideId,
      ride: ride,
      departments: Array.from(departmentPrices.entries()).map(([dept, data]) => ({
        department: dept,
        price: data.price,
        passengerCount: data.passengerCount,
        employees: data.employees,
        percentage: (data.passengerCount / totalPassengers) * 100
      }))
    });
  });
  
  // המרת totals ל-array
  const departmentTotalsArray = Array.from(departmentTotals.entries()).map(([dept, total]) => ({
    department: dept,
    total: total,
    rideCount: departmentBreakdown.filter(
      breakdown => breakdown.departments.some(d => d.department === dept)
    ).length
  }));
  
  return {
    breakdown: departmentBreakdown,
    totals: departmentTotalsArray.sort((a, b) => b.total - a.total)
  };
}

/**
 * קבלת כל הנסיעות של מחלקה מסוימת
 */
export function getRidesByDepartment(departmentBreakdown, departmentName) {
  return departmentBreakdown
    .filter(item => 
      item.departments.some(d => d.department === departmentName)
    )
    .map(item => {
      const deptData = item.departments.find(d => d.department === departmentName);
      return {
        ...item,
        departmentData: deptData
      };
    });
}
