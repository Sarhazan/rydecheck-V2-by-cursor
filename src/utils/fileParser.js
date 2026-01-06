// External libraries
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { GETT_EMPTY_COLUMN_MAPPING, GETT_COLUMN_NAMES } from './gettConstants.js';

/**
 * חילוץ מספרי עובדים (PIDs) משדה ההיסטוריה
 * @param {string} historyField - שדה ההיסטוריה המכיל את ה-PIDs בפורמט |pids=123,456|
 * @returns {number[]} מערך של מספרי עובדים
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
 * עיבוד נתוני נסיעות לאחר פרסינג
 * @param {Array} data - מערך של שורות מהקובץ
 * @param {Function} resolve - פונקציה לפתרון Promise
 * @param {Array} headers - מערך של כותרות העמודות (אופציונלי)
 */
function processRidesData(data, resolve, headers = []) {
  const rides = data.map((row, index) => {
    // ניקוי מקפים מהכותרות - אם הכותרות מכילות מקפים, נסיר אותם
    const cleanRow = {};
    Object.keys(row).forEach(key => {
      const cleanKey = String(key).replace(/^["']|["']$/g, '').trim();
      let value = row[key];
      // אם הערך הוא מחרוזת עם מקפים, נסיר אותם
      if (typeof value === 'string') {
        value = value.replace(/^["']|["']$/g, '').trim();
      }
      cleanRow[cleanKey] = value;
    });
    
    // חילוץ pids משני מקומות אפשריים
    const historyPids = extractPids(cleanRow.היסטוריה || '');
    const altPids = extractPids(cleanRow['תחנות נוסעים חלופיות'] || '');
    
    // אם מספר ה-PIDs ב-historyPids תואם למספר הנוסעים בשדה נוסעים,
    // נשתמש רק ב-historyPids (כי altField יכול להכיל נתונים לא רלוונטיים)
    const passengersField = cleanRow.נוסעים || '';
    let useOnlyHistoryPids = false;
    let passengerNames = [];
    try {
      passengerNames = passengersField.split(/[;,\n]/).map(p => p.trim()).filter(p => p && p.length > 0);
      const passengerCount = passengerNames.length;
      // אם יש historyPids ומספרם תואם למספר הנוסעים, נשתמש רק בהם
      if (passengerCount > 0 && historyPids.length > 0 && historyPids.length === passengerCount) {
        useOnlyHistoryPids = true;
      } else if (passengerCount === 1) {
        // אם יש רק נוסע אחד, תמיד נשתמש רק ב-historyPids
        useOnlyHistoryPids = true;
      }
    } catch (e) {
      // אם יש שגיאה בפיצול, נשתמש בשני המקורות
      useOnlyHistoryPids = false;
      passengerNames = [];
    }
    
    // איחוד pids משני המקומות (ללא כפילויות)
    const allPids = useOnlyHistoryPids 
      ? historyPids 
      : [...new Set([...historyPids, ...altPids])];
    
    // חילוץ מחיר - ננסה כמה אפשרויות
    let priceRaw = cleanRow.מחיר || '';
    // אם לא נמצא, ננסה למצוא את המפתח "מחיר" (בדיוק, לא "מחיר חלקים")
    if (!priceRaw) {
      const priceKey = Object.keys(cleanRow).find(k => {
        const trimmed = k.trim();
        return trimmed === 'מחיר' || (trimmed.includes('מחיר') && !trimmed.includes('חלקים') && !trimmed.includes('קוד'));
      });
      if (priceKey) {
        priceRaw = cleanRow[priceKey] || '';
      }
    }
    const price = parseFloat(priceRaw);
    
    // חילוץ rideId - ננסה כמה אפשרויות
    let rideId = null;
    if (cleanRow._ID) {
      rideId = parseInt(String(cleanRow._ID).replace(/[^0-9]/g, ''));
    } else {
      // ננסה למצוא את המפתח _ID במפתחות שונים
      const idKey = Object.keys(cleanRow).find(k => k.trim() === '_ID' || k.trim().includes('_ID'));
      if (idKey) {
        rideId = parseInt(String(cleanRow[idKey]).replace(/[^0-9]/g, ''));
      }
    }
    
    // חילוץ תאריך ושעה - אם יש שדה נפרד לשעה, נשתמש בו
    let dateValue = cleanRow.תאריך || '';
    let timeValue = cleanRow.שעה || cleanRow.time || cleanRow.Time || cleanRow.זמן || '';
    
    // אם התאריך כולל כבר שעה (יש רווח), נשאיר אותו כמו שהוא
    // אם יש שדה נפרד לשעה, נצרף אותו לתאריך
    if (dateValue && timeValue && !dateValue.includes(' ')) {
      dateValue = `${dateValue} ${timeValue}`;
    }
    
    // חילוץ הערות - ננסה למצוא לפי שם או לפי אינדקס (עמודה AF = אינדקס 31)
    let notes = '';
    
    // נסיון ראשון: חיפוש לפי שם
    const notesKeys = ['הערות', 'הערה', 'notes', 'Notes', 'NOTE', 'note', 'הערות נוספות', 'הערות נסיעה'];
    for (const key of notesKeys) {
      if (cleanRow[key] !== undefined && cleanRow[key] !== null && String(cleanRow[key]).trim() !== '') {
        notes = String(cleanRow[key]).trim();
        break;
      }
    }
    
    // נסיון שני: אם לא נמצא לפי שם, ננסה לפי אינדקס (עמודה AF = אינדקס 31)
    // אם יש לנו את headers, נוכל למצוא את שם העמודה באינדקס 31
    if (!notes && headers && headers.length > 31) {
      const columnName = headers[31];
      if (columnName && cleanRow[columnName] !== undefined) {
        const value = String(cleanRow[columnName] || '').trim();
        if (value) {
          notes = value;
        }
      }
    }
    
    // נסיון שלישי: אם עדיין לא מצאנו, נחפש בכל המפתחות לפי מיקום יחסי
    // ננסה למצוא מפתח שמתחיל ב-"AF" או מפתח שמכיל "31"
    if (!notes) {
      const allKeys = Object.keys(cleanRow);
      for (const key of allKeys) {
        const keyUpper = key.toUpperCase().trim();
        if (keyUpper === 'AF' || keyUpper.includes('AF') || key.includes('31')) {
          const value = String(cleanRow[key] || '').trim();
          if (value) {
            notes = value;
            break;
          }
        }
      }
    }

    const rideData = {
      rideId: isNaN(rideId) ? null : rideId,
      date: dateValue,
      passengers: cleanRow.נוסעים || '',
      pids: allPids,
      source: cleanRow.מוצא || '',
      destination: cleanRow.יעד || '',
      price: isNaN(price) ? 0 : price,
      supplier: cleanRow.ספק || '',
      notes: notes, // הוספת שדה הערות
      rawData: cleanRow
    };
    
    return rideData;
  });
  
  const filteredRides = rides.filter(ride => {
    return ride.rideId !== null;
  });
  
  resolve(filteredRides);
}

/**
 * פארסינג ידני של שורת CSV
 * מטפל במירכאות ובתווים מיוחדים
 */
function parseCSVLine(line, delimiter) {
  const values = [];
  let currentValue = '';
  let insideQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = i < line.length - 1 ? line[i + 1] : '';
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // מירכאות כפולות - מירכא אחת בתוך מירכאות
        currentValue += '"';
        i++; // דילוג על המירכא הבאה
      } else {
        // התחלה/סיום של מירכאות
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      // מפריד מחוץ למירכאות
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  
  // הוספת הערך האחרון
  values.push(currentValue.trim());
  
  return values;
}

/**
 * פארסינג קובץ רייד (CSV) - פרסור ידני
 * @param {string} data - תוכן הקובץ
 * @param {string} filename - שם הקובץ
 * @returns {Promise<Array>} Promise שמחזיר מערך של נסיעות
 */
export function parseRideFile(data, filename) {
  return new Promise((resolve, reject) => {
    try {
      // 1. פיצול לשורות
      const lines = data.split(/\r?\n/).filter(line => line.trim().length > 0);
      
      if (lines.length === 0) {
        resolve([]);
        return;
      }
      
      // 2. זיהוי delimiter - בדיקת השורה הראשונה
      let delimiter = ',';
      const firstLine = lines[0];
      const pipeCount = (firstLine.match(/\|/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      
      // אם יש יותר pipes מ-commas, נשתמש ב-pipe
      if (pipeCount > commaCount) {
        delimiter = '|';
      }
      
      // 3. חיפוש שורת כותרות (השורה שמכילה _ID)
      let headerRowIndex = -1;
      let headers = [];
      
      for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i];
        const values = parseCSVLine(line, delimiter);
        const firstValue = values[0] || '';
        const cleanFirstValue = firstValue.replace(/^["']|["']$/g, '').trim();
        
        if (cleanFirstValue === '_ID' || cleanFirstValue === '"_ID"' || cleanFirstValue.includes('_ID')) {
          headerRowIndex = i;
          headers = values.map(h => h.replace(/^["']|["']$/g, '').trim());
          break;
        }
      }
      
      if (headerRowIndex === -1 || headers.length === 0) {
        // לא מצאנו שורת כותרות - ננסה להשתמש בשורה הראשונה
        headerRowIndex = 0;
        headers = parseCSVLine(lines[0], delimiter).map(h => h.replace(/^["']|["']$/g, '').trim());
      }
      
      // 4. פרסור כל שורה ידנית
      const dataRows = [];
      for (let i = headerRowIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        const values = parseCSVLine(line, delimiter);
        
        // ניקוי מקפים מהערכים
        const cleanedValues = values.map(v => v.replace(/^["']|["']$/g, '').trim());
        
        // יצירת אובייקט עם כל העמודות
        const row = {};
        headers.forEach((header, index) => {
          row[header] = cleanedValues[index] || '';
        });
        
        dataRows.push(row);
      }
      
      // 5. עיבוד הנתונים - מעבירים גם את הכותרות כדי שנוכל למצוא עמודות לפי אינדקס
      processRidesData(dataRows, resolve, headers);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * פארסינג קובץ מסד עובדים (CSV)
 * @param {string} data - תוכן הקובץ
 * @returns {Promise<Object>} Promise שמחזיר אובייקט עם employees ו-employeeMap
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
 * @param {Object} row - שורה מהקובץ
 * @param {string[]} possibleNames - רשימת שמות אפשריים לעמודה
 * @returns {*} ערך העמודה שנמצאה או null
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
 * פרסור מחיר ממחרוזת או מספר
 * מטפל במספרים, מחרוזות עם תווים מיוחדים (₪, פסיקים, רווחים)
 * @param {number|string|null|undefined} priceValue - ערך המחיר לפרסור
 * @returns {number} מחיר כמספר, או 0 אם לא ניתן לפרסר
 */
function parsePrice(priceValue) {
  if (priceValue === null || priceValue === undefined || priceValue === '') {
    return 0;
  }
  
  if (typeof priceValue === 'number') {
    return priceValue;
  }
  
  // הסרת תווים מיותרים (₪, פסיקים, רווחים)
  const cleanPrice = String(priceValue).replace(/[₪,\s]/g, '').trim();
  const parsed = parseFloat(cleanPrice);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * חילוץ הערות ספק - טקסט מוקף בכוכביות (*** או יותר)
 * הפונקציה מסירה טקסט מוקף בכוכביות מהמחרוזת ומחזירה את הטקסט המנוקה ואת ההערות שהוסרו
 * 
 * @param {string} text - הטקסט המקורי שעלול להכיל הערות מוקפות בכוכביות
 * @returns {{cleaned: string, notes: string}} אובייקט עם הטקסט המנוקה וההערות שהוסרו
 * 
 * @example
 * extractSupplierNotes("*** נסיעה בוטלה *** פיזור: נתבג")
 * // { cleaned: "פיזור: נתבג", notes: "*** נסיעה בוטלה ***" }
 * 
 * @example
 * extractSupplierNotes("**** נסיעה בוטלה")
 * // { cleaned: "", notes: "**** נסיעה בוטלה" }
 */
function extractSupplierNotes(text) {
  if (!text || typeof text !== 'string') {
    return { cleaned: text || '', notes: '' };
  }
  
  // חיפוש כל הטקסטים המוקפים בכוכביות (3 כוכביות או יותר)
  // מחפש גם מקרים שבהם יש כמה בלוקים של כוכביות עם טקסט ביניהם
  // דוגמה: "*** נסיעה בוטלה *** עדכון ***" או "**** נסיעה בוטלה" או "*** נסיעה בוטלה ***"
  const asteriskPatternFull = /\*{3,}[^*]*\*{3,}/g; // *** טקסט ***
  const asteriskPatternStart = /^\*{3,}[^*]+/; // *** טקסט (בהתחלה)
  const asteriskPatternEnd = /[^*]+\*{3,}$/; // טקסט *** (בסוף)
  const notes = [];
  let cleaned = text;
  
  // מציאת כל ההתאמות - כולל כל הבלוקים של כוכביות
  let match;
  const allMatches = [];
  
  // חיפוש בלוקים מלאים: *** טקסט ***
  asteriskPatternFull.lastIndex = 0;
  while ((match = asteriskPatternFull.exec(text)) !== null) {
    allMatches.push(match[0].trim());
  }
  
  // חיפוש בלוקים בהתחלה: *** טקסט (ללא כוכביות בסוף)
  const startMatch = text.match(asteriskPatternStart);
  if (startMatch && !allMatches.some(m => m.includes(startMatch[0]))) {
    allMatches.push(startMatch[0].trim());
  }
  
  // חיפוש בלוקים בסוף: טקסט *** (ללא כוכביות בהתחלה)
  const endMatch = text.match(asteriskPatternEnd);
  if (endMatch && !allMatches.some(m => m.includes(endMatch[0]))) {
    allMatches.push(endMatch[0].trim());
  }
  
  // אם יש התאמות, נשמור אותן כהערות
  if (allMatches.length > 0) {
    notes.push(...allMatches);
    
    // הסרת כל הטקסטים המוקפים בכוכביות
    cleaned = cleaned.replace(asteriskPatternFull, '').trim();
    cleaned = cleaned.replace(asteriskPatternStart, '').trim();
    cleaned = cleaned.replace(asteriskPatternEnd, '').trim();
    // ניקוי רווחים כפולים
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
  }
  
  return {
    cleaned: cleaned,
    notes: notes.join(' ')
  };
}

/**
 * חילוץ מספר הזמנה משורת גט
 * @param {Object} row - שורה מהקובץ
 * @returns {string|null} מספר הזמנה או null
 */
function extractGettOrderNumber(row) {
  let orderNumberStr = null;
  const emptyKey = `__EMPTY_${GETT_EMPTY_COLUMN_MAPPING.ORDER_NUMBER}`;
  if (row.hasOwnProperty(emptyKey)) {
    orderNumberStr = String(row[emptyKey] || '').trim();
  }
  // נסה גם לחלץ מספר מהמחרוזת אם יש
  return orderNumberStr ? (orderNumberStr.match(/\d+/)?.[0] || orderNumberStr) : null;
}

/**
 * חילוץ תאריך ושעה משורת גט
 * @param {Object} row - שורה מהקובץ
 * @param {Function} findColumn - פונקציה למציאת עמודה
 * @returns {Object} אובייקט עם date ו-time
 */
function extractGettDateTime(row, findColumn) {
  let dateStr = findColumn(row, GETT_COLUMN_NAMES.DATE);
  let timeStr = findColumn(row, GETT_COLUMN_NAMES.TIME);
  
  // אם לא נמצא לפי שם, נשתמש במיקום לפי __EMPTY
  const emptyKey = GETT_EMPTY_COLUMN_MAPPING.DATE_TIME === 0 ? '__EMPTY' : `__EMPTY_${GETT_EMPTY_COLUMN_MAPPING.DATE_TIME}`;
  if (!dateStr && row.hasOwnProperty(emptyKey)) {
    // תאריך ושעה ביחד - פורמט: "2025-11-29 21:00"
    const dateTimeStr = String(row[emptyKey] || '').trim();
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
  
  return { date: dateStr || '', time: timeStr || '' };
}

/**
 * חילוץ מקור ויעד משורת גט
 * @param {Object} row - שורה מהקובץ
 * @param {Function} findColumn - פונקציה למציאת עמודה
 * @returns {Object} אובייקט עם source ו-destination
 */
function extractGettLocations(row, findColumn) {
  let sourceStr = findColumn(row, GETT_COLUMN_NAMES.SOURCE);
  let destStr = findColumn(row, GETT_COLUMN_NAMES.DESTINATION);
  
  // אם לא נמצא לפי שם, נשתמש במיקום לפי __EMPTY
  const sourceEmptyKey = `__EMPTY_${GETT_EMPTY_COLUMN_MAPPING.SOURCE}`;
  if (!sourceStr && row.hasOwnProperty(sourceEmptyKey)) {
    sourceStr = String(row[sourceEmptyKey] || '').trim();
  }
  const destEmptyKey = `__EMPTY_${GETT_EMPTY_COLUMN_MAPPING.DESTINATION}`;
  if (!destStr && row.hasOwnProperty(destEmptyKey)) {
    destStr = String(row[destEmptyKey] || '').trim();
  }
  
  return { source: sourceStr || '', destination: destStr || '' };
}

/**
 * חילוץ נוסעים משורת גט
 * @param {Object} row - שורה מהקובץ
 * @param {Function} findColumn - פונקציה למציאת עמודה
 * @returns {string} מחרוזת נוסעים
 */
function extractGettPassengers(row, findColumn) {
  let passengersStr = findColumn(row, GETT_COLUMN_NAMES.PASSENGERS);
  
  // אם לא נמצא לפי שם, נשתמש במיקום לפי __EMPTY
  const passengersEmptyKey = `__EMPTY_${GETT_EMPTY_COLUMN_MAPPING.PASSENGERS}`;
  if (!passengersStr && row.hasOwnProperty(passengersEmptyKey)) {
    passengersStr = String(row[passengersEmptyKey] || '').trim();
  }
  
  return passengersStr || '';
}

/**
 * פרסור שורת גט
 * @param {Object} row - שורה מהקובץ
 * @param {number} index - אינדקס השורה
 * @param {string|null} autoPriceColumnKey - מפתח עמודת מחיר אוטומטית
 * @param {Function} findColumn - פונקציה למציאת עמודה
 * @returns {Object} אובייקט עם נתוני הנסיעה
 */
function parseGettRow(row, index, autoPriceColumnKey, findColumn) {
  // חילוץ מספר הזמנה
  const orderNumber = extractGettOrderNumber(row);
  
  // חילוץ תאריך ושעה
  const { date: dateStr, time: timeStr } = extractGettDateTime(row, findColumn);
  
  // חילוץ מקור ויעד
  const { source: sourceStr, destination: destStr } = extractGettLocations(row, findColumn);
  
  // חילוץ נוסעים
  const passengersStr = extractGettPassengers(row, findColumn);
  
  // חילוץ מחיר
  let priceValue = findColumn(row, GETT_COLUMN_NAMES.PRICE);
  
  // אם לא נמצא לפי שם, נשתמש במיקום לפי __EMPTY
  const priceEmptyKey = `__EMPTY_${GETT_EMPTY_COLUMN_MAPPING.PRICE}`;
  if (!priceValue && row.hasOwnProperty(priceEmptyKey)) {
    priceValue = String(row[priceEmptyKey] || '').trim();
  }
  
  // אם לא נמצא ונמצא עמודה אוטומטית, נשתמש בה
  if ((!priceValue || priceValue === 0 || priceValue === '') && autoPriceColumnKey && row[autoPriceColumnKey] !== undefined) {
    priceValue = row[autoPriceColumnKey];
  }
  
  // טיפול במחיר - שימוש בפונקציה משותפת
  const price = parsePrice(priceValue);
  
  return {
    date: dateStr,
    time: timeStr,
    source: sourceStr,
    destination: destStr,
    passengers: passengersStr,
    price: price,
    orderNumber: orderNumber,
    rawData: row,
    index: index
  };
}

/**
 * מציאת עמודת מחיר אוטומטית לפי תוכן (אם לא נמצא שם)
 * @param {Object} row - שורה מהקובץ
 * @param {Array} allRows - כל השורות מהקובץ
 * @returns {string|null} מפתח העמודה (key) שנמצאה או null
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
 * @param {File} file - קובץ Excel
 * @param {string} supplierType - סוג הספק ('bontour', 'hori', 'gett')
 * @returns {Promise<Array>} Promise שמחזיר מערך של נסיעות מהספק
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
        } else if (supplierType === 'hori') {
          // חורי: ייתכן שיש שורת כותרת בשורה 0, אז נזהה את שורת הכותרות
          // קודם כל נקרא את כל הנתונים כ-array כדי לזהות את שורת הכותרות
          const allData = XLSX.utils.sheet_to_json(worksheet, { 
            defval: '',
            raw: false,
            header: 1 // קורא לפי מערך (array) במקום לפי header
          });
          
          // נחפש את שורת הכותרות - השורה שמכילה "מספר ויזה" או "תאריך"
          let headerRowIndex = 0;
          for (let i = 0; i < Math.min(5, allData.length); i++) {
            const rowStr = allData[i].join(' ').toLowerCase();
            if (rowStr.includes('מספר ויזה') || rowStr.includes('תאריך')) {
              headerRowIndex = i;
              break;
            }
          }
          
          // אם מצאנו שורת כותרות שלא בשורה 0, נמיר את הנתונים ידנית
          if (headerRowIndex >= 0 && headerRowIndex < allData.length) {
            const headers = allData[headerRowIndex];
            const dataRows = allData.slice(headerRowIndex + 1);
            
            // המרה למערך של אובייקטים
            parsedData = dataRows.map(row => {
              const obj = {};
              headers.forEach((header, index) => {
                if (header) {
                  obj[header] = row[index] !== undefined ? row[index] : '';
                }
              });
              return obj;
            });
          } else {
            // אם לא מצאנו שורת כותרות, נמיר כרגיל
            parsedData = XLSX.utils.sheet_to_json(worksheet, { 
              defval: '',
              raw: false 
            });
          }
        } else {
          // המרה ל-JSON רגיל (בון תור וכו')
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            defval: '',
            raw: false 
          });
          
          parsedData = jsonData;
        }
        
        let autoPriceColumnKey = null;
        if (parsedData.length > 0) {
          const firstRow = parsedData[0];
          // עבור חורי, עדיפות ל-"סה"כ ללקוח-לפני מע"מ"
          const priceColumnNames = supplierType === 'hori' 
            ? ['סה"כ ללקוח-לפני מע"מ', 'מחיר', 'סכום', 'price', 'amount', 'total', 'מחיר כולל', 'סך הכל', 'מחיר סופי', 'סה"כ']
            : ['מחיר', 'סכום', 'price', 'amount', 'total', 'מחיר כולל', 'סך הכל', 'מחיר סופי', 'סה"כ'];
          const priceValue = findColumn(firstRow, priceColumnNames);
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
            
            
            // טיפול במחיר - שימוש בפונקציה משותפת
            const price = parsePrice(priceValue);
            
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
            const tripNumber = findColumn(row, ['מספר נסיעה', 'מספר נסיעה ', 'trip number', 'מספר', 'מספר הזמנה', 'מספר ויזה']);
            // עדיפות ל-"סה"כ ללקוח-לפני מע"מ" עבור חורי (חודש 09.25)
            let priceValue = findColumn(row, ['סה"כ ללקוח-לפני מע"מ', 'מחיר', 'סכום', 'price', 'amount', 'total', 'מחיר כולל', 'סך הכל', 'מחיר סופי', 'סה"כ', 'מחיר לתשלום']);
            
            // אם לא נמצא ונמצא עמודה אוטומטית, נשתמש בה
            if ((!priceValue || priceValue === 0 || priceValue === '') && autoPriceColumnKey && row[autoPriceColumnKey] !== undefined) {
              priceValue = row[autoPriceColumnKey];
            }
            
            const dateStr = findColumn(row, ['תאריך', 'date', 'תאריך נסיעה']);
            const timeStr = findColumn(row, ['שעה', 'time', 'זמן']);
            
            // חילוץ מקור ויעד עבור חורי - חיפוש בשמות שונים
            // נסה גם שמות עם נקודה-פסיק או פורמטים שונים
            // עבור חורי, מקור ויעד יכולים להיות בשדה אחד עם נקודה-פסיק או בשדות נפרדים
            // חשוב: לא לחפש בשדות של זמן/תאריך
            let sourceStr = findColumn(row, [
              'מקור', 'source', 'מוצא', 'מקום איסוף', 'איסוף', 'pickup', 'from',
              'איסוף:', 'מקור:', 'מוצא:', 'מקום איסוף:', 'איסוף:',
              'מיקום איסוף', 'מאיפה', 'מאין', 'נקודת איסוף',
              'נקודת התחלה', 'התחלה', 'start', 'start location', 'pickup location',
              'מקור נסיעה', 'מקור הנסיעה', 'מקור (ספק)', 'מקור (חורי)'
            ]);
            // בדיקה: אם sourceStr נראה כמו שעה (פורמט HH:MM:SS או HH:MM), נאפס אותו
            if (sourceStr && /^\d{1,2}:\d{2}(:\d{2})?$/.test(String(sourceStr).trim())) {
              sourceStr = null;
            }
            let destinationStr = findColumn(row, [
              'יעד', 'destination', 'dest', 'מקום פיזור', 'פיזור', 'dropoff', 'to',
              'יעד:', 'מקום פיזור:', 'פיזור:', 'יעד (ספק)', 'מיקום פיזור',
              'לאן', 'נקודת פיזור', 'נקודת סיום', 'סיום', 'end', 'end location',
              'dropoff location', 'יעד נסיעה', 'יעד הנסיעה', 'יעד (חורי)'
            ]);
            // בדיקה: אם destinationStr נראה כמו שעה, נאפס אותו
            if (destinationStr && /^\d{1,2}:\d{2}(:\d{2})?$/.test(String(destinationStr).trim())) {
              destinationStr = null;
            }
            
            // אם לא נמצאו בשדות נפרדים, ננסה לחפש בשדה משולב (עם נקודה-פסיק)
            if (!sourceStr && !destinationStr) {
              // נחפש שדה שמכיל גם "איסוף" וגם "פיזור" או "נתבג"
              const combinedField = findColumn(row, ['מקור', 'יעד', 'מיקום', 'מיקום איסוף', 'מיקום פיזור', 'פיזור', 'איסוף']);
              if (combinedField) {
                const combinedStr = String(combinedField);
                // ננסה לחלץ מקור ויעד משדה משולב
                // פורמט אפשרי: "איסוף: X - פיזור: Y" או "X ; Y" או "X - Y"
                if (combinedStr.includes('פיזור:') && combinedStr.includes('איסוף:')) {
                  const pickupMatch = combinedStr.match(/איסוף:\s*([^פ-]+)/);
                  const dropoffMatch = combinedStr.match(/פיזור:\s*([^א-]+)/);
                  if (pickupMatch) sourceStr = pickupMatch[1].trim();
                  if (dropoffMatch) destinationStr = dropoffMatch[1].trim();
                } else if (combinedStr.includes(';')) {
                  const parts = combinedStr.split(';');
                  if (parts.length >= 2) {
                    sourceStr = parts[0].trim();
                    destinationStr = parts[1].trim();
                  }
                } else if (combinedStr.includes(' - ')) {
                  const parts = combinedStr.split(' - ');
                  if (parts.length >= 2) {
                    sourceStr = parts[0].trim();
                    destinationStr = parts[1].trim();
                  }
                }
              }
            }
            
            // חילוץ נוסעים עבור חורי
            const passengersStr = findColumn(row, ['נוסעים', 'passengers', 'נוסע', 'שם נוסע', 'שמות נוסעים', 'שם', 'names']);
            
            // טיפול במחיר - שימוש בפונקציה משותפת
            const price = parsePrice(priceValue);
            
            // חילוץ tripNumber עם בדיקה ל-NaN
            let parsedTripNumber = null;
            if (tripNumber !== null && tripNumber !== undefined && tripNumber !== '') {
              if (typeof tripNumber === 'number') {
                parsedTripNumber = tripNumber;
              } else {
                const cleaned = String(tripNumber).replace(/[^0-9]/g, '').trim();
                if (cleaned.length > 0) {
                  const parsed = parseInt(cleaned);
                  parsedTripNumber = (!isNaN(parsed) && parsed > 0) ? parsed : null;
                }
              }
            }
            
            // חילוץ הערות ממקור ויעד - אחרי כל העדכונים (אחרי parsedTripNumber מאותחל)
            let sourceNotes = '';
            let destNotes = '';
            if (sourceStr) {
              const sourceExtracted = extractSupplierNotes(String(sourceStr));
              sourceStr = sourceExtracted.cleaned;
              sourceNotes = sourceExtracted.notes;
            }
            if (destinationStr) {
              const destExtracted = extractSupplierNotes(String(destinationStr));
              destinationStr = destExtracted.cleaned;
              destNotes = destExtracted.notes;
            }
            
            // שילוב הערות ממקור ויעד
            const supplierNotes = [sourceNotes, destNotes].filter(n => n && n.trim() !== '').join(' ').trim();
            
            return {
              tripNumber: parsedTripNumber,
              price: price,
              date: dateStr || '',
              time: timeStr || '',
              source: sourceStr || '',
              destination: destinationStr || '',
              passengers: passengersStr || '',
              supplierNotes: supplierNotes || '', // הערות ספק - טקסט מוקף בכוכביות
              rawData: row,
              index: index
            };
          } else if (supplierType === 'gett') {
            // גט - שימוש בפונקציה נפרדת לפרסור
            return parseGettRow(row, index, autoPriceColumnKey, findColumn);
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
            // סינון נסיעות ללא tripNumber תקין (null, NaN, או 0)
            // גם נסיעות עם מחיר אבל ללא tripNumber תקין - כנראה שורת סיכום או נסיעה לא תקינה
            const hasInvalidTripNumber = item.tripNumber === null || isNaN(item.tripNumber) || item.tripNumber === 0;
            
            if (hasInvalidTripNumber) {
              return false; // נסיעה זו תיסנן ולא תגיע ל-rideMatcher
            }
            
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
 * @param {File} file - קובץ לטעינה
 * @param {string} fileType - סוג הקובץ ('ride', 'employees', 'bontour', 'hori', 'gett')
 * @returns {Promise<Array|Object>} Promise שמחזיר את הנתונים המפורסים
 */
export async function parseFile(file, fileType) {
  if (file.name.endsWith('.csv')) {
    const text = await file.text();
    
    if (fileType === 'ride') {
      const result = await parseRideFile(text, file.name);
      return result;
    } else if (fileType === 'employees') {
      const result = await parseEmployeesFile(text);
      return result;
    }
  } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    if (fileType === 'bontour' || fileType === 'hori' || fileType === 'gett') {
      const result = await parseExcelFile(file, fileType);
      return result;
    }
  }
  
  throw new Error('סוג קובץ לא נתמך');
}
