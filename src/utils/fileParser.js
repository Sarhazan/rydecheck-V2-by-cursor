import * as XLSX from 'xlsx';
import Papa from 'papaparse';

/**
 * חילוץ מספרי עובדים (pids) משדה ההיסטוריה
 */
export function extractPids(historyField) {
  if (!historyField) return [];
  
  const pidMatch = historyField.match(/\|pids=([^|]+)\|/);
  if (!pidMatch) return [];
  
  const pidsString = pidMatch[1];
  return pidsString
    .split(',')
    .map(pid => pid.trim())
    .filter(pid => pid && pid !== '')
    .map(pid => parseInt(pid))
    .filter(pid => !isNaN(pid));
}

/**
 * פארסינג קובץ רייד
 */
export function parseRideFile(data, filename) {
  return new Promise((resolve, reject) => {
    Papa.parse(data, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        try {
          const rides = results.data.map(row => {
            // חילוץ pids משני מקומות אפשריים
            const historyPids = extractPids(row.היסטוריה || '');
            const altPids = extractPids(row['תחנות נוסעים חלופיות'] || '');
            // איחוד pids משני המקומות (ללא כפילויות)
            const allPids = [...new Set([...historyPids, ...altPids])];
            
            const priceRaw = row.מחיר || '';
            const price = parseFloat(priceRaw);
            
            return {
              rideId: row._ID ? parseInt(row._ID) : null,
              date: row.תאריך || '',
              passengers: row.נוסעים || '',
              pids: allPids,
              source: row.מוצא || '',
              destination: row.יעד || '',
              price: isNaN(price) ? 0 : price,
              supplier: row.ספק || '',
              rawData: row
            };
          }).filter(ride => ride.rideId !== null);
          
          resolve(rides);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => reject(error)
    });
  });
}

/**
 * פארסינג קובץ מסד עובדים
 */
export function parseEmployeesFile(data) {
  return new Promise((resolve, reject) => {
    Papa.parse(data, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        try {
          const employees = results.data.map(row => ({
            employeeId: row._ID ? parseInt(row._ID) : null,
            firstName: row['שם פרטי'] || '',
            lastName: row['שם משפחה'] || '',
            department: row.מחלקה || '',
            rawData: row
          })).filter(emp => emp.employeeId !== null);
          
          // יצירת מפה מהירה לחיפוש לפי ID
          const employeeMap = new Map();
          employees.forEach(emp => {
            employeeMap.set(emp.employeeId, emp);
          });
          
          resolve({ employees, employeeMap });
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => reject(error)
    });
  });
}

/**
 * מציאת עמודה לפי שמות אפשריים
 */
function findColumn(row, possibleNames) {
  if (!row) return null;
  
  const keys = Object.keys(row);
  
  // נסיון ראשון: התאמה מדויקת
  for (const name of possibleNames) {
    if (row.hasOwnProperty(name)) {
      return row[name];
    }
  }
  
  // נסיון שני: התאמה ללא רווחים מיותרים
  for (const name of possibleNames) {
    const found = keys.find(k => {
      const kTrim = k.trim();
      const nameTrim = name.trim();
      return kTrim === nameTrim || 
             kTrim.replace(/\s+/g, ' ') === nameTrim.replace(/\s+/g, ' ') ||
             kTrim.toLowerCase() === nameTrim.toLowerCase();
    });
    if (found) {
      return row[found];
    }
  }
  
  // נסיון שלישי: התאמה חלקית
  for (const name of possibleNames) {
    const found = keys.find(k => {
      const kLower = k.toLowerCase().trim();
      const nameLower = name.toLowerCase().trim();
      return kLower.includes(nameLower) || nameLower.includes(kLower);
    });
    if (found) {
      return row[found];
    }
  }
  
  return null;
}

/**
 * מציאת עמודת מחיר אוטומטית לפי תוכן (אם לא נמצא שם)
 * מחזירה את מפתח העמודה (key) ולא את הערך
 */
function findPriceColumnAuto(row, allRows) {
  if (!row || !allRows || allRows.length === 0) return null;
  
  const keys = Object.keys(row);
  
  // נסיון למצוא עמודה שמכילה בעיקר מספרים/מחירים
  for (const key of keys) {
    // דילוג על עמודות לא רלוונטיות (מספרי הזמנה, תאריכים וכו')
    const keyLower = key.toLowerCase().trim();
    if (keyLower.includes('מספר') || keyLower.includes('תאריך') || keyLower.includes('date') || 
        keyLower.includes('שעה') || keyLower.includes('time') || keyLower.includes('מקור') ||
        keyLower.includes('יעד') || keyLower.includes('נוסע')) {
      continue;
    }
    
    const values = allRows.slice(0, Math.min(10, allRows.length))
      .map(r => r[key])
      .filter(v => v !== null && v !== undefined && v !== '');
    
    if (values.length === 0) continue;
    
    // בודק אם רוב הערכים הם מספרים
    const numericCount = values.filter(v => {
      if (typeof v === 'number') return true;
      const str = String(v).replace(/[₪,\s]/g, '').trim();
      return !isNaN(parseFloat(str)) && parseFloat(str) > 0;
    }).length;
    
    // אם לפחות 70% מהערכים הם מספרים חיוביים, כנראה זו עמודת מחיר
    if (numericCount / values.length >= 0.7) {
      // בודק שהערכים הגיוניים (בין 10 ל-10000 שקל)
      const numericValues = values
        .map(v => {
          if (typeof v === 'number') return v;
          const str = String(v).replace(/[₪,\s]/g, '').trim();
          return parseFloat(str) || 0;
        })
        .filter(v => v > 0);
      
      if (numericValues.length === 0) continue;
      
      const avgValue = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;
      
      if (avgValue >= 10 && avgValue <= 10000) {
        return key; // מחזירים את המפתח של העמודה
      }
    }
  }
  
  return null;
}

/**
 * פארסינג קובץ Excel (בון תור, חורי, גט)
 */
export function parseExcelFile(file, supplierType) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // לוקח את הגיליון הראשון
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        let parsedData = [];
        
        if (supplierType === 'gett') {
          // גט: דילוג על 15 שורות ראשונות (שורה 16 = תחילת נתונים)
          // אין header row, אז נמיר לפי מיקום עמודות
          const allData = XLSX.utils.sheet_to_json(worksheet, { 
            defval: '',
            raw: false,
            header: 1 // קורא לפי מערך (array) במקום לפי header
          });
          
          // דילוג על 15 שורות ראשונות (index 0-14), השורה 15 (index 15) היא השורה הראשונה עם נתונים
          // מהלוגים: __EMPTY (0) = תאריך+שעה, __EMPTY_5 (5) = מקור, __EMPTY_6 (6) = יעד, __EMPTY_9 (9) = מחיר, __EMPTY_10 (10) = נוסעים
          const dataRows = allData.slice(15);
          parsedData = dataRows.map(row => {
            const obj = {};
            row.forEach((val, idx) => {
              if (idx === 0) {
                obj['__EMPTY'] = val || '';
              } else {
                obj[`__EMPTY_${idx}`] = val || '';
              }
            });
            return obj;
          });
        } else {
          // המרה ל-JSON רגיל
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            defval: '',
            raw: false 
          });
          
          parsedData = jsonData;
        }
        
        let autoPriceColumnKey = null;
        if (parsedData.length > 0) {
          const firstRow = parsedData[0];
          const priceValue = findColumn(firstRow, ['מחיר', 'סכום', 'price', 'amount', 'total', 'מחיר כולל', 'סך הכל', 'מחיר סופי', 'סה"כ']);
          if (!priceValue || priceValue === 0 || priceValue === '') {
            autoPriceColumnKey = findPriceColumnAuto(firstRow, parsedData);
          }
        }
        
        // המרה לפורמט אחיד לפי סוג הספק
        const normalized = parsedData.map((row, index) => {
          if (supplierType === 'bontour') {
            const orderNumber = findColumn(row, ['מספר הזמנה', 'מספר הזמנה ', 'order number', 'מספר']);
            let priceValue = findColumn(row, ['מחיר', 'סכום', 'price', 'amount', 'total', 'מחיר כולל', 'סך הכל', 'מחיר סופי', 'סה"כ', 'מחיר לתשלום']);
            
            // אם לא נמצא ונמצא עמודה אוטומטית, נשתמש בה
            if ((!priceValue || priceValue === 0 || priceValue === '') && autoPriceColumnKey && row[autoPriceColumnKey] !== undefined) {
              priceValue = row[autoPriceColumnKey];
            }
            
            const dateStr = findColumn(row, ['תאריך', 'date', 'תאריך הזמנה']);
            
            // חילוץ מקור, יעד ושמות נוסעים
            // בקובץ בון תור: "תאור" מכיל את המקור והיעד, "מספר ויזה" מכיל את הנוסעים
            let sourceStr = findColumn(row, ['מקור', 'מאת', 'from', 'From', 'מקום התחלה', 'מוצא', 'מקור נסיעה', 'נקודת איסוף']);
            let destStr = findColumn(row, ['יעד', 'אל', 'to', 'To', 'מקום סיום', 'יעד נסיעה', 'נקודת יעד']);
            let passengersStr = findColumn(row, ['נוסעים', 'passengers', 'Passengers', 'נוסע', 'שמות נוסעים', 'שם נוסע', 'שם', 'נוסעים במכונית', 'מספר ויזה']);
            
            // בקובץ בון תור - נסה לחלץ מתוך "תאור"
            const descriptionStr = findColumn(row, ['תאור', 'תיאור', 'description', 'Description', 'פרטים', 'הערות']);
            if (descriptionStr && (!sourceStr || !destStr)) {
              // נסה לחלץ מקור ויעד מתוך התאור
              // פורמט אפשרי: "מקור → יעד" או "מקור - יעד" או "מקור ליעד"
              const description = String(descriptionStr).trim();
              if (description) {
                // נסה לחלק לפי חצים או מקפים
                const separators = ['→', '->', '-', 'ל', 'עד', 'לעבר', 'לש', 'לש ', ' ל', ' ל '];
                for (const sep of separators) {
                  if (description.includes(sep)) {
                    const parts = description.split(sep).map(p => p.trim()).filter(p => p);
                    if (parts.length >= 2) {
                      if (!sourceStr) sourceStr = parts[0];
                      if (!destStr) destStr = parts.slice(1).join(' '); // כל מה שאחרי המפריד
                      break;
                    }
                  }
                }
                // אם לא מצאנו מפריד, ננסה לחלק לפי הרווח הראשון או אחרון
                if (!sourceStr && !destStr) {
                  // אולי התאור הוא רק יעד או רק מקור
                  destStr = description; // נניח שזה יעד
                }
              }
            }
            
            
            // טיפול במחיר - יכול להיות מספר או מחרוזת
            let price = 0;
            if (priceValue !== null && priceValue !== undefined && priceValue !== '') {
              if (typeof priceValue === 'number') {
                price = priceValue;
              } else {
                // הסרת תווים מיותרים (₪, פסיקים, רווחים)
                const cleanPrice = String(priceValue).replace(/[₪,\s]/g, '').trim();
                const parsed = parseFloat(cleanPrice);
                price = isNaN(parsed) ? 0 : parsed;
              }
            }
            
            return {
              orderNumber: orderNumber ? (typeof orderNumber === 'number' ? orderNumber : parseInt(String(orderNumber).replace(/[^0-9]/g, ''))) : null,
              price: price,
              date: dateStr || '',
              source: sourceStr || '',
              destination: destStr || '',
              passengers: passengersStr || '',
              rawData: row,
              index: index
            };
          } else if (supplierType === 'hori') {
            const tripNumber = findColumn(row, ['מספר נסיעה', 'מספר נסיעה ', 'trip number', 'מספר', 'מספר הזמנה']);
            let priceValue = findColumn(row, ['מחיר', 'סכום', 'price', 'amount', 'total', 'מחיר כולל', 'סך הכל', 'מחיר סופי', 'סה"כ', 'מחיר לתשלום']);
            
            // אם לא נמצא ונמצא עמודה אוטומטית, נשתמש בה
            if ((!priceValue || priceValue === 0 || priceValue === '') && autoPriceColumnKey && row[autoPriceColumnKey] !== undefined) {
              priceValue = row[autoPriceColumnKey];
            }
            
            const dateStr = findColumn(row, ['תאריך', 'date', 'תאריך נסיעה']);
            
            // טיפול במחיר - יכול להיות מספר או מחרוזת
            let price = 0;
            if (priceValue !== null && priceValue !== undefined && priceValue !== '') {
              if (typeof priceValue === 'number') {
                price = priceValue;
              } else {
                // הסרת תווים מיותרים (₪, פסיקים, רווחים)
                const cleanPrice = String(priceValue).replace(/[₪,\s]/g, '').trim();
                const parsed = parseFloat(cleanPrice);
                price = isNaN(parsed) ? 0 : parsed;
              }
            }
            
            return {
              tripNumber: tripNumber ? (typeof tripNumber === 'number' ? tripNumber : parseInt(String(tripNumber).replace(/[^0-9]/g, ''))) : null,
              price: price,
              date: dateStr || '',
              rawData: row,
              index: index
            };
          } else if (supplierType === 'gett') {
            // גט - חיפוש לפי מיקום או לפי שם עמודה
            // אם יש __EMPTY, זה אומר שאין header row, אז נשתמש במיקום העמודות
            let dateStr = findColumn(row, ['תאריך', 'date', 'Date', 'תאריך נסיעה']);
            let timeStr = findColumn(row, ['שעה', 'time', 'Time', 'זמן']);
            let sourceStr = findColumn(row, ['מקור', 'מאת', 'from', 'From', 'מקום התחלה']);
            let destStr = findColumn(row, ['יעד', 'אל', 'to', 'To', 'מקום סיום']);
            let passengersStr = findColumn(row, ['נוסעים', 'passengers', 'Passengers', 'נוסע']);
            let priceValue = findColumn(row, ['מחיר', 'price', 'Price', 'סכום', 'amount', 'מחיר כולל', 'סך הכל', 'מחיר סופי', 'סה"כ', 'מחיר לתשלום']);
            
            // אם לא נמצא לפי שם, נשתמש במיקום לפי הלוגים:
            // __EMPTY: תאריך ושעה (index 0) - פורמט: "2025-11-29 21:00"
            // __EMPTY_1: תאריך הזמנה (index 1)
            // __EMPTY_2: מספר הזמנה (index 2) - פורמט: "77954422"
            // __EMPTY_5: מקור (index 5)
            // __EMPTY_6: יעד (index 6)
            // __EMPTY_9: מחיר (index 9) - פורמט: "₪ 76.09"
            // __EMPTY_10: נוסעים (index 10)
            
            // חילוץ מספר הזמנה
            let orderNumberStr = null;
            if (row.hasOwnProperty('__EMPTY_2')) {
              orderNumberStr = String(row.__EMPTY_2 || '').trim();
            }
            // נסה גם לחלץ מספר מהמחרוזת אם יש
            const orderNumber = orderNumberStr ? (orderNumberStr.match(/\d+/)?.[0] || orderNumberStr) : null;
            
            if (!dateStr && row.hasOwnProperty('__EMPTY')) {
              // תאריך ושעה ביחד - פורמט: "2025-11-29 21:00"
              const dateTimeStr = String(row.__EMPTY || '').trim();
              if (dateTimeStr) {
                const parts = dateTimeStr.split(/\s+/);
                if (parts.length >= 2) {
                  dateStr = parts[0] || '';
                  timeStr = parts.slice(1).join(' ') || '';
                } else {
                  dateStr = dateTimeStr;
                }
              }
            }
            if (!sourceStr && row.hasOwnProperty('__EMPTY_5')) {
              sourceStr = String(row.__EMPTY_5 || '').trim();
            }
            if (!destStr && row.hasOwnProperty('__EMPTY_6')) {
              destStr = String(row.__EMPTY_6 || '').trim();
            }
            if (!passengersStr && row.hasOwnProperty('__EMPTY_10')) {
              passengersStr = String(row.__EMPTY_10 || '').trim();
            }
            if (!priceValue && row.hasOwnProperty('__EMPTY_9')) {
              priceValue = String(row.__EMPTY_9 || '').trim();
            }
            
            // אם לא נמצא ונמצא עמודה אוטומטית, נשתמש בה
            if ((!priceValue || priceValue === 0 || priceValue === '') && autoPriceColumnKey && row[autoPriceColumnKey] !== undefined) {
              priceValue = row[autoPriceColumnKey];
            }
            
            // טיפול במחיר - יכול להיות מספר או מחרוזת
            let price = 0;
            if (priceValue !== null && priceValue !== undefined && priceValue !== '') {
              if (typeof priceValue === 'number') {
                price = priceValue;
              } else {
                // הסרת תווים מיותרים (₪, פסיקים, רווחים)
                const cleanPrice = String(priceValue).replace(/[₪,\s]/g, '').trim();
                const parsed = parseFloat(cleanPrice);
                price = isNaN(parsed) ? 0 : parsed;
              }
            }
            
            const parsedRow = {
              date: dateStr || '',
              time: timeStr || '',
              source: sourceStr || '',
              destination: destStr || '',
              passengers: passengersStr || '',
              price: price,
              orderNumber: orderNumber || null,
              rawData: row,
              index: index
            };
            
            return parsedRow;
          }
          return { rawData: row, index: index };
        }).filter(item => {
          // סינון שורות ריקות ושורות סיכום
          if (supplierType === 'bontour') {
            // בדיקה אם זה מספר הזמנה חוקי (לא שורת סיכום)
            if (item.orderNumber === null) return false;
            
            // בדיקה אם orderNumber הוא מחרוזת שמכילה מילות מפתח של סיכום
            const orderNumberStr = String(item.orderNumber).toLowerCase().trim();
            const summaryKeywords = ['סה"כ', 'סיכום', 'total', 'summary', 'נסיעות', 'מחיר'];
            const isSummaryInOrderNumber = summaryKeywords.some(keyword => orderNumberStr.includes(keyword));
            
            // בדיקה אם זה שורת סיכום - בדיקת כל העמודות למילים כמו "סה"כ", "סיכום" וכו'
            const rawRow = item.rawData || {};
            const allValues = Object.values(rawRow).map(v => String(v || '').toLowerCase().trim());
            const fullSummaryKeywords = ['סה"כ', 'סיכום', 'סה"כ נסיעות', 'total', 'summary', 'סה"כ מחיר', 'סה"כ מחירים', 'סה"כ נסיעות', 'סה"כ נסיעות', 'סה"כ סכום'];
            const isSummaryRow = allValues.some(val => fullSummaryKeywords.some(keyword => val.includes(keyword) || keyword.includes(val)));
            
            const shouldFilter = isSummaryInOrderNumber || isSummaryRow;
            
            
            return !shouldFilter;
          } else if (supplierType === 'hori') {
            if (item.tripNumber === null) return false;
            
            // בדיקה אם זה שורת סיכום
            const rawRow = item.rawData || {};
            const allValues = Object.values(rawRow).map(v => String(v || '').toLowerCase().trim());
            const summaryKeywords = ['סה"כ', 'סיכום', 'סה"כ נסיעות', 'total', 'summary', 'סה"כ מחיר'];
            const isSummaryRow = allValues.some(val => summaryKeywords.some(keyword => val.includes(keyword) || keyword.includes(val)));
            
            return !isSummaryRow;
          } else if (supplierType === 'gett') {
            const shouldInclude = item.date || item.source || item.destination;
            return shouldInclude;
          }
          return true;
        });
        
        resolve(normalized);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * פארסינג קובץ כללי (CSV או Excel)
 */
export async function parseFile(file, fileType) {
  if (file.name.endsWith('.csv')) {
    const text = await file.text();
    
    if (fileType === 'ride') {
      return await parseRideFile(text, file.name);
    } else if (fileType === 'employees') {
      return await parseEmployeesFile(text);
    }
  } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    if (fileType === 'bontour' || fileType === 'hori' || fileType === 'gett') {
      return await parseExcelFile(file, fileType);
    }
  }
  
  throw new Error('סוג קובץ לא נתמך');
}
