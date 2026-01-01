import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * שמות חודשים בעברית
 */
const monthNames = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

/**
 * פרסור תאריך לפורמט Date
 * @param {string} dateStr - מחרוזת תאריך
 * @returns {Date|null} תאריך או null אם לא ניתן לפרסר
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  let dateParts;
  const dateOnly = dateStr.split(' ')[0]; // לוקח רק את החלק של התאריך
  
  if (dateOnly.includes('/')) {
    dateParts = dateOnly.split('/');
  } else if (dateOnly.includes('-')) {
    dateParts = dateOnly.split('-');
    // אם זה YYYY-MM-DD, נהפוך ל-DD/MM/YYYY
    if (dateParts.length === 3 && dateParts[0].length === 4) {
      dateParts = [dateParts[2], dateParts[1], dateParts[0]];
    }
  } else {
    return null;
  }
  
  if (dateParts.length < 3) return null;
  
  const day = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1;
  const year = parseInt(dateParts[2], 10);
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  
  return new Date(year, month, day);
}

/**
 * חישוב החודש הנפוץ ביותר מהתאריכים של הנסיעות
 * @param {Array} matches - מערך של התאמות
 * @returns {string} שם החודש בעברית
 */
function calculateMonthFromRides(matches) {
  const monthCounts = new Map();
  
  matches.forEach(match => {
    let dateStr = null;
    if (match.ride && match.ride.date) {
      dateStr = match.ride.date;
    } else if (match.supplierData && match.supplierData.date) {
      dateStr = match.supplierData.date;
    }
    
    if (dateStr) {
      const date = parseDate(dateStr);
      if (date) {
        const month = date.getMonth();
        monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
      }
    }
  });
  
  if (monthCounts.size === 0) {
    // אם לא נמצאו תאריכים, נחזיר את החודש הנוכחי
    return monthNames[new Date().getMonth()];
  }
  
  // מציאת החודש הנפוץ ביותר
  let maxCount = 0;
  let mostCommonMonth = new Date().getMonth();
  
  monthCounts.forEach((count, month) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommonMonth = month;
    }
  });
  
  return monthNames[mostCommonMonth];
}

/**
 * המרת מחרוזת נוסעים (PID numbers) לשמות עובדים
 * @param {string} passengersStr - מחרוזת עם מספרי PID
 * @param {Map} employeeMap - מפת עובדים
 * @returns {string} מחרוזת עם שמות העובדים
 */
function getEmployeeNames(passengersStr, employeeMap) {
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
}

/**
 * פורמט תאריך עם זמן
 * @param {string} dateStr - מחרוזת תאריך
 * @param {string} timeStr - מחרוזת זמן (אופציונלי)
 * @returns {string} תאריך מעוצב
 */
function formatDateWithTime(dateStr, timeStr = '') {
  if (!dateStr) return '-';
  
  if (dateStr.includes(' ')) {
    return dateStr;
  }
  
  if (timeStr && timeStr.trim()) {
    return `${dateStr} ${timeStr.trim()}`;
  }
  
  return dateStr;
}

/**
 * ייצוא PDF להפרשי מחיר
 * @param {Object} matchResults - תוצאות ההתאמות לכל ספק
 * @param {string} selectedSupplier - הספק הנבחר ('bontour', 'hori', 'gett')
 * @param {string} supplierName - שם הספק בעברית
 * @param {Map} employeeMap - מפת עובדים (employeeId -> employee)
 * @param {Map} updatedPrices - מפת מחירים מעודכנים (rideId -> price)
 */
export function exportPriceDifferencesPDF(matchResults, selectedSupplier, supplierName, employeeMap, updatedPrices = new Map()) {
  const results = matchResults[selectedSupplier] || [];
  
  // סינון נסיעות עם הפרש מחיר
  const priceDiffMatches = results.filter(match => {
    if (selectedSupplier === 'gett') {
      // עבור גט: matched עם priceDifference > 0.01
      return match.status === 'matched' && 
             match.priceDifference !== null && 
             match.priceDifference !== undefined && 
             match.priceDifference > 0.01;
    } else {
      // עבור בון תור וחורי: status === 'price_difference'
      return match.status === 'price_difference';
    }
  });
  
  if (priceDiffMatches.length === 0) {
    alert('אין נסיעות עם הפרש מחיר לייצוא');
    return;
  }
  
  // חישוב החודש
  const month = calculateMonthFromRides(priceDiffMatches);
  const currentYear = new Date().getFullYear();
  
  // יצירת PDF
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  
  // כותרת ראשית
  doc.setFontSize(18);
  doc.text(`עבור ספק ${supplierName}`, 148, 20, { align: 'center' });
  
  // כותרת משנה
  doc.setFontSize(14);
  doc.text(`הפרשי מחירים עבור חודש ${month} ${currentYear}`, 148, 30, { align: 'center' });
  
  // הכנת נתונים לטבלה
  const tableData = priceDiffMatches.map(match => {
    const rideId = match.ride?.rideId || '-';
    const orderNumber = selectedSupplier === 'hori' 
      ? (match.supplierData?.tripNumber || '-')
      : (match.supplierData?.orderNumber || match.supplierData?.orderId || '-');
    
    const date = match.ride 
      ? formatDateWithTime(match.ride.date)
      : formatDateWithTime(match.supplierData?.date, match.supplierData?.time);
    
    const source = match.ride?.source || match.supplierData?.source || '-';
    const destination = match.ride?.destination || match.supplierData?.destination || '-';
    
    const passengers = match.ride?.passengers 
      ? getEmployeeNames(match.ride.passengers, employeeMap)
      : (match.supplierData?.passengers 
          ? getEmployeeNames(match.supplierData.passengers, employeeMap)
          : '-');
    
    // מחיר רייד - שימוש במחיר מעודכן אם קיים
    const ridePrice = match.ride 
      ? (updatedPrices.has(match.ride.rideId) 
          ? updatedPrices.get(match.ride.rideId) 
          : (match.ride.price || 0))
      : 0;
    
    const supplierPrice = match.supplierData?.price || 0;
    const priceDiff = match.priceDifference || Math.abs(ridePrice - supplierPrice);
    
    return [
      rideId.toString(),
      orderNumber.toString(),
      date,
      source,
      destination,
      passengers,
      `₪${ridePrice.toFixed(2)}`,
      `₪${supplierPrice.toFixed(2)}`,
      `₪${priceDiff.toFixed(2)}`
    ];
  });
  
  // יצירת הטבלה
  doc.autoTable({
    startY: 40,
    head: [[
      'קוד נסיעה רייד',
      selectedSupplier === 'hori' ? 'מספר נסיעה' : 'מספר הזמנה',
      'תאריך',
      'מקור',
      'יעד',
      'נוסעים',
      'מחיר רייד',
      'מחיר ספק',
      'הפרש מחיר'
    ]],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      halign: 'right',
      font: 'Arial'
    },
    styles: {
      font: 'Arial',
      fontSize: 9,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 25 }, // קוד נסיעה
      1: { cellWidth: 25 }, // מספר הזמנה
      2: { cellWidth: 30 }, // תאריך
      3: { cellWidth: 40 }, // מקור
      4: { cellWidth: 40 }, // יעד
      5: { cellWidth: 50 }, // נוסעים
      6: { cellWidth: 25 }, // מחיר רייד
      7: { cellWidth: 25 }, // מחיר ספק
      8: { cellWidth: 25 }  // הפרש מחיר
    },
    margin: { top: 40, right: 10, bottom: 10, left: 10 }
  });
  
  // שם קובץ
  const fileName = `הפרשי_מחירים_${supplierName}_${month}_${currentYear}.pdf`;
  
  // הורדה
  doc.save(fileName);
}
