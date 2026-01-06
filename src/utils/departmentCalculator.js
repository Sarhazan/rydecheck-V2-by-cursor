/**
 * חישוב חלוקה מחלקתית לכל נסיעה
 * @param {Array} rides - מערך של נסיעות
 * @param {Map} employeeMap - מפה של עובדים (key: employeeId, value: employee object)
 * @param {Map} passenger55555Departments - מפה של שיוך מחלקתי לנסיעות עם נוסע 55555 (key: rideId, value: departmentName)
 * @returns {Object} אובייקט עם breakdown (חלוקה לכל נסיעה) ו-totals (סיכומים למחלקות)
 */
export function calculateDepartmentBreakdown(rides, employeeMap, passenger55555Departments = new Map()) {
  const departmentBreakdown = [];
  const departmentTotals = new Map();
  
  rides.forEach(ride => {
    // בדיקה אם יש שיוך מחלקתי ידני לנסיעה עם נוסע 55555
    const assignedDepartment = passenger55555Departments.get(ride.rideId);
    
    // קיבוץ עובדים לפי מחלקה
    const employeesByDepartment = new Map();
    let totalValidPassengers = 0; // רק PIDs שנמצאים ב-employeeMap
    
    if (ride.pids && ride.pids.length > 0) {
      ride.pids.forEach(pid => {
        // דילוג על נוסע 55555 אם יש שיוך מחלקתי ידני
        if (pid === 55555 && assignedDepartment) {
          return;
        }
        
        const employee = employeeMap.get(pid);
        if (employee && employee.department) {
          const dept = employee.department;
          if (!employeesByDepartment.has(dept)) {
            employeesByDepartment.set(dept, []);
          }
          employeesByDepartment.get(dept).push(employee);
          totalValidPassengers++; // נספר רק עובדים שנמצאים ב-map
        }
      });
    }
    
    // אם יש שיוך מחלקתי ידני, נוסיף אותו לחלוקה
    if (assignedDepartment) {
      // נוסיף את המחלקה שהוקצתה ל-employeesByDepartment (אם לא קיימת)
      if (!employeesByDepartment.has(assignedDepartment)) {
        employeesByDepartment.set(assignedDepartment, []);
      }
      // נחשוב שהנוסע 55555 הוא חלק מהמחלקה שהוקצתה (נוסיף 1 לספירת הנוסעים)
      totalValidPassengers++;
    }
    
    // אם אין עובדים תקינים ואין שיוך מחלקתי ידני, נשים את הנסיעה במחלקה "ללא מחלקה"
    if (totalValidPassengers === 0) {
      const noDepartment = 'ללא מחלקה';
      const ridePrice = ride.price || 0;
      
      departmentBreakdown.push({
        rideId: ride.rideId,
        ride: ride,
        departments: [{
          department: noDepartment,
          price: ridePrice,
          passengerCount: 0,
          employees: [],
          percentage: 100
        }]
      });
      
      // עדכון סה"כ מחלקתי
      if (!departmentTotals.has(noDepartment)) {
        departmentTotals.set(noDepartment, 0);
      }
      departmentTotals.set(noDepartment, departmentTotals.get(noDepartment) + ridePrice);
      return;
    }
    
    // חישוב מחיר לכל מחלקה
    // משתמשים ב-totalValidPassengers במקום ride.pids.length כדי לחשב נכון
    const departmentPrices = new Map();
    
    employeesByDepartment.forEach((employees, department) => {
      // חישוב מספר הנוסעים - אם זה המחלקה שהוקצתה ידנית, נוסיף 1 לנוסע 55555
      let departmentPassengerCount = employees.length;
      if (assignedDepartment === department) {
        // אם יש שיוך מחלקתי ידני למחלקה הזאת, נחשוב שיש לה נוסע נוסף (55555)
        departmentPassengerCount = employees.length + 1;
      }
      
      const departmentPrice = (departmentPassengerCount / totalValidPassengers) * (ride.price || 0);
      
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
        percentage: (data.passengerCount / totalValidPassengers) * 100
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
  
  // מיון: "ללא מחלקה" תמיד ראשון, אחר כך לפי סכום יורד
  const sortedTotals = departmentTotalsArray.sort((a, b) => {
    if (a.department === 'ללא מחלקה') return -1;
    if (b.department === 'ללא מחלקה') return 1;
    return b.total - a.total;
  });
  
  return {
    breakdown: departmentBreakdown,
    totals: sortedTotals
  };
}

/**
 * קבלת כל הנסיעות של מחלקה מסוימת
 * @param {Array} departmentBreakdown - חלוקה מחלקתית של כל הנסיעות
 * @param {string} departmentName - שם המחלקה
 * @returns {Array} מערך של נסיעות עם נתוני המחלקה
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
