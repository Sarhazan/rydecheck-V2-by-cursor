import * as XLSX from 'xlsx';
import JSZip from 'jszip';

/**
 * ייצוא דוח Excel למחלקה
 */
function createDepartmentExcelReport(departmentName, ridesData) {
  // יצירת נתונים לטבלה
  const data = ridesData.map(item => {
    const ride = item.ride;
    const deptData = item.departmentData;
    const employeeNames = deptData.employees
      .map(emp => `${emp.firstName} ${emp.lastName}`)
      .join(', ');
    
    return {
      'קוד נסיעה': ride.rideId,
      'תאריך': ride.date,
      'מקור': ride.source,
      'יעד': ride.destination,
      'שמות עובדים': employeeNames,
      'מחיר כולל': typeof ride.price === 'number' ? ride.price.toFixed(2) : ride.price,
      'מחיר למחלקה': typeof deptData.price === 'number' ? deptData.price.toFixed(2) : deptData.price
    };
  });
  
  // יצירת workbook
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'דוח נסיעות');
  
  // הגדרת רוחב עמודות
  const colWidths = [
    { wch: 12 }, // קוד נסיעה
    { wch: 18 }, // תאריך
    { wch: 30 }, // מקור
    { wch: 30 }, // יעד
    { wch: 40 }, // שמות עובדים
    { wch: 15 }, // מחיר כולל
    { wch: 18 }  // מחיר למחלקה
  ];
  ws['!cols'] = colWidths;
  
  // הגדרת RTL לתאים (אופציונלי)
  if (!ws['!rows']) ws['!rows'] = [];
  const firstRow = ws['!rows'][0] || {};
  if (!firstRow.hpt) firstRow.hpt = 20;
  ws['!rows'][0] = firstRow;
  
  // המרה ל-buffer
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

/**
 * ייצוא כל הדוחות למחלקות כקובץ ZIP
 */
export async function exportDepartmentReports(departmentBreakdown) {
  const zip = new JSZip();
  
  // קיבוץ לפי מחלקות
  const departmentsMap = new Map();
  
  departmentBreakdown.forEach(item => {
    item.departments.forEach(dept => {
      if (!departmentsMap.has(dept.department)) {
        departmentsMap.set(dept.department, []);
      }
      
      departmentsMap.get(dept.department).push({
        ...item,
        departmentData: dept
      });
    });
  });
  
  // יצירת קובץ Excel לכל מחלקה
  departmentsMap.forEach((ridesData, departmentName) => {
    const excelBuffer = createDepartmentExcelReport(departmentName, ridesData);
    const fileName = `${departmentName}.xlsx`.replace(/[/\\?%*:|"<>]/g, '_'); // ניקוי תווים אסורים
    zip.file(fileName, excelBuffer);
  });
  
  // יצירת קובץ ZIP והורדה
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `דוחות_מחלקות_${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * ייצוא דוח כללי של כל ההתאמות
 */
export function exportAnalysisReport(matchResults, rideNotes = new Map()) {
  const allReports = [];
  
  // בון תור
  if (matchResults.bontour && matchResults.bontour.length > 0) {
    const bontourData = matchResults.bontour.map(match => {
      const rideId = match.ride ? match.ride.rideId : null;
      const note = rideId && rideNotes.has(rideId) ? rideNotes.get(rideId) : '';
      return {
        'ספק': 'בון תור',
        'קוד נסיעה רייד': match.ride ? match.ride.rideId : '',
        'מספר הזמנה': match.supplierData ? match.supplierData.orderNumber : '',
        'תאריך': match.ride ? match.ride.date : (match.supplierData ? match.supplierData.date : ''),
        'מקור': match.ride ? match.ride.source : '',
        'יעד': match.ride ? match.ride.destination : '',
        'מחיר רייד': match.ride ? (typeof match.ride.price === 'number' ? match.ride.price.toFixed(2) : match.ride.price) : '',
        'מחיר ספק': match.supplierData ? (typeof match.supplierData.price === 'number' ? match.supplierData.price.toFixed(2) : match.supplierData.price) : '',
        'הפרש מחיר': match.priceDifference ? (typeof match.priceDifference === 'number' ? match.priceDifference.toFixed(2) : match.priceDifference) : '',
        'הערות': note,
        'סטטוס': match.status,
        'נוסף ידנית': match.ride && match.ride.isManual ? `כן - מספר הזמנה: ${match.ride.supplierOrderNumber || ''}` : ''
      };
    });
    allReports.push(...bontourData);
  }
  
  // חורי
  if (matchResults.hori && matchResults.hori.length > 0) {
    const horiData = matchResults.hori.map(match => {
      const rideId = match.ride ? match.ride.rideId : null;
      const note = rideId && rideNotes.has(rideId) ? rideNotes.get(rideId) : '';
      return {
        'ספק': 'חורי',
        'קוד נסיעה רייד': match.ride ? match.ride.rideId : '',
        'מספר נסיעה': match.supplierData ? match.supplierData.tripNumber : '',
        'תאריך': match.ride ? match.ride.date : (match.supplierData ? match.supplierData.date : ''),
        'מקור': match.ride ? match.ride.source : '',
        'יעד': match.ride ? match.ride.destination : '',
        'מחיר רייד': match.ride ? (typeof match.ride.price === 'number' ? match.ride.price.toFixed(2) : match.ride.price) : '',
        'מחיר ספק': match.supplierData ? (typeof match.supplierData.price === 'number' ? match.supplierData.price.toFixed(2) : match.supplierData.price) : '',
        'הפרש מחיר': match.priceDifference ? (typeof match.priceDifference === 'number' ? match.priceDifference.toFixed(2) : match.priceDifference) : '',
        'הערות': note,
        'סטטוס': match.status,
        'נוסף ידנית': match.ride && match.ride.isManual ? `כן - מספר הזמנה: ${match.ride.supplierOrderNumber || ''}` : ''
      };
    });
    allReports.push(...horiData);
  }
  
  // גט
  if (matchResults.gett && matchResults.gett.length > 0) {
    const gettData = matchResults.gett.map(match => {
      const rideId = match.ride ? match.ride.rideId : null;
      const note = rideId && rideNotes.has(rideId) ? rideNotes.get(rideId) : '';
      return {
        'ספק': 'גט',
        'קוד נסיעה רייד': match.ride ? match.ride.rideId : '',
        'מספר הזמנה': match.supplierData ? match.supplierData.orderNumber : '',
        'מקור גט': match.supplierData ? match.supplierData.source : '',
        'יעד גט': match.supplierData ? match.supplierData.destination : '',
        'תאריך': match.ride ? match.ride.date : (match.supplierData ? match.supplierData.date : ''),
        'מקור רייד': match.ride ? match.ride.source : '',
        'יעד רייד': match.ride ? match.ride.destination : '',
        'מחיר רייד': match.ride ? (typeof match.ride.price === 'number' ? match.ride.price.toFixed(2) : match.ride.price) : '',
        'מחיר ספק': match.supplierData ? (typeof match.supplierData.price === 'number' ? match.supplierData.price.toFixed(2) : match.supplierData.price) : '',
        'הפרש מחיר': match.priceDifference ? (typeof match.priceDifference === 'number' ? match.priceDifference.toFixed(2) : match.priceDifference) : '',
        'הערות': note,
        'סטטוס': match.status,
        'ביטחון התאמה': match.matchConfidence ? (match.matchConfidence * 100).toFixed(1) + '%' : '',
        'נוסף ידנית': match.ride && match.ride.isManual ? `כן - מספר הזמנה: ${match.ride.supplierOrderNumber || ''}` : ''
      };
    });
    allReports.push(...gettData);
  }
  
  // יצירת workbook
  const ws = XLSX.utils.json_to_sheet(allReports);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'דוח התאמות');
  
  // הורדה
  XLSX.writeFile(wb, `דוח_התאמות_${new Date().toISOString().split('T')[0]}.xlsx`);
}
