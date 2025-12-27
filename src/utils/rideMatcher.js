/**
 * נרמול שמות מקומות להשוואה
 * @param {string} location - שם המקום
 * @returns {string} שם מקום מנורמל
 */
function normalizeLocation(location) {
  if (!location) return '';
  return location
    .trim()
    .replace(/[^\u0590-\u05FF\u0020\u002D]/g, '') // רק עברית, רווחים ומקפים
    .toLowerCase()
    .replace(/\s+/g, ' '); // רווחים מרובים לרווח אחד
}

/**
 * חישוב הפרש זמן בדקות בין שני תאריכים/זמנים
 * @param {string} date1 - תאריך ראשון
 * @param {string} time1 - זמן ראשון
 * @param {string} date2 - תאריך שני
 * @param {string} time2 - זמן שני
 * @returns {number} הפרש בדקות או Infinity אם יש שגיאה
 */
function getTimeDifferenceInMinutes(date1, time1, date2, time2) {
  try {
    const parseDateTime = (dateStr, timeStr) => {
      if (!dateStr) return null;
      
      // פורמט אפשריים: DD/MM/YYYY, DD/MM/YYYY HH:MM, YYYY-MM-DD
      let dateParts, timeParts = ['00', '00'];
      
      if (dateStr.includes(' ')) {
        // יש זמן בתוך התאריך
        const parts = dateStr.split(' ');
        dateStr = parts[0];
        timeStr = parts[1] || timeStr;
      }
      
      if (dateStr.includes('/')) {
        dateParts = dateStr.split('/');
      } else if (dateStr.includes('-')) {
        dateParts = dateStr.split('-').reverse(); // YYYY-MM-DD -> DD/MM/YYYY
      } else {
        return null;
      }
      
      if (timeStr) {
        timeParts = timeStr.split(':');
      }
      
      if (dateParts.length < 3) return null;
      
      const day = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1;
      const year = parseInt(dateParts[2]);
      const hours = parseInt(timeParts[0]) || 0;
      const minutes = parseInt(timeParts[1]) || 0;
      
      if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
      
      return new Date(year, month, day, hours, minutes);
    };
    
    const dt1 = parseDateTime(date1, time1);
    const dt2 = parseDateTime(date2, time2);
    
    if (!dt1 || !dt2) return Infinity;
    
    return Math.abs(dt1 - dt2) / (1000 * 60); // הפרש בדקות
  } catch (error) {
    return Infinity;
  }
}

/**
 * בדיקה אם יש נוסע משותף בין נסיעת רייד לנסיעת גט
 * @param {number[]} ridePids - מערך של PIDs מנסיעת רייד
 * @param {string} gettPassengersStr - מחרוזת נוסעים מנסיעת גט
 * @param {Map} employeeMap - מפה של עובדים
 * @returns {boolean} true אם יש נוסע משותף
 */
function hasCommonPassenger(ridePids, gettPassengersStr, employeeMap) {
  if (!ridePids || ridePids.length === 0) return false;
  if (!gettPassengersStr) return false;
  
  const ridePidsSet = new Set(ridePids.map(p => p.toString()));
  
  // 1. חיפוש מספרים בתוך מחרוזת הנוסעים של גט
  const gettNumbers = gettPassengersStr.match(/\d+/g) || [];
  const numericMatch = gettNumbers.some(num => ridePidsSet.has(num));
  
  if (numericMatch) {
    return true;
  }
  
  // 2. אם יש employeeMap, ננסה למצוא התאמה לפי שמות
  if (employeeMap && employeeMap.size > 0) {
    // נמיר את ridePids לשמות עובדים
    const rideNamesSet = new Set();
    const rideNamesDetails = [];
    ridePids.forEach(pid => {
      const emp = employeeMap.get(pid);
      if (emp) {
        const fullName = `${emp.firstName} ${emp.lastName}`.trim();
        if (fullName) {
          rideNamesSet.add(fullName.toLowerCase());
          rideNamesDetails.push({pid, fullName: fullName.toLowerCase(), firstName: emp.firstName ? emp.firstName.toLowerCase() : null, lastName: emp.lastName ? emp.lastName.toLowerCase() : null});
          // גם שם פרטי בלבד ושם משפחה בלבד
          if (emp.firstName) rideNamesSet.add(emp.firstName.toLowerCase());
          if (emp.lastName) rideNamesSet.add(emp.lastName.toLowerCase());
        }
      } else {
        rideNamesDetails.push({pid, fullName: null, firstName: null, lastName: null});
      }
    });
    
    if (rideNamesSet.size === 0) {
      // אם אין שמות ב-employeeMap לפי PID, ננסה לחפש את השם ישירות ב-employeeMap
      // זה יכול לקרות אם יש אי-התאמה ב-PID (למשל, employeeId שונה מ-PID)
      if (gettPassengersStr && employeeMap) {
        const gettClean = gettPassengersStr.toLowerCase().replace(/[*|,;]/g, ' ').replace(/\s+/g, ' ').trim();
        const gettWords = gettClean.split(' ').filter(w => w && w.length > 1);
        
        // נחפש את השם ב-employeeMap
        for (const [empId, emp] of employeeMap.entries()) {
          const empFullName = `${emp.firstName} ${emp.lastName}`.trim().toLowerCase();
          const empFirstName = emp.firstName ? emp.firstName.toLowerCase().trim() : '';
          const empLastName = emp.lastName ? emp.lastName.toLowerCase().trim() : '';
          
          // בדיקה אם השם מגט תואם לשם העובד
          if (gettClean === empFullName || 
              (gettWords.length >= 2 && gettWords[0] === empFirstName && gettWords[1] === empLastName) ||
              (empFullName.includes(gettClean) || gettClean.includes(empFullName))) {
            return true;
          }
        }
        
        // אם PID לא נמצא ב-employeeMap אבל יש שם בגט, נחזיר true
        // זה יכול לקרות אם העובד לא נמצא בקובץ העובדים או שיש אי-התאמה ב-PID
        // נחזיר true רק אם יש שם בגט (כלומר, גט הזדהה מישהו)
        if (gettClean && gettClean.trim().length > 0) {
          return true;
        }
      }
      
      return false;
    }
    
    // נבדוק אם שמות בגט תואמים לשמות ברייד
    const gettPassengersLower = gettPassengersStr.toLowerCase();
    
    // נסיר תווים מיוחדים כמו **, *, , וכו'
    const gettClean = gettPassengersLower.replace(/[*|,;]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // נבדוק אם אחד השמות ב-rideNamesSet מופיע ב-gettClean
    let nameMatch = false;
    let matchedName = null;
    for (const rideName of rideNamesSet) {
      if (rideName && gettClean.includes(rideName)) {
        nameMatch = true;
        matchedName = rideName;
        break;
      }
    }
    
    // אם לא נמצאה התאמה מדויקת, ננסה התאמה חלקית לפי שם משפחה
    // זה מטפל במקרים של שגיאות כתיב בשם הפרטי (למשל "נגה" vs "נועה")
    if (!nameMatch) {
      const gettWords = gettClean.split(' ').filter(w => w && w.length > 1);
      for (const rideNameDetail of rideNamesDetails) {
        if (rideNameDetail.lastName && rideNameDetail.lastName.trim()) {
          const lastName = rideNameDetail.lastName.trim();
          // נבדוק אם שם המשפחה מופיע בגט
          if (gettWords.some(word => word === lastName || lastName.includes(word) || word.includes(lastName))) {
            // אם יש גם שם פרטי בגט, נבדוק שהוא דומה (לפחות 2 תווים תואמים)
            const firstNameInGett = gettWords.find(word => word !== lastName && !lastName.includes(word) && !word.includes(lastName));
            if (firstNameInGett && rideNameDetail.firstName) {
              const firstName = rideNameDetail.firstName.trim();
              // נבדוק אם יש חפיפה של לפחות 2 תווים בין השם הפרטי בגט לשם הפרטי ב-employeeMap
              // זה יטפל במקרים כמו "נועה" vs "נגה" (יש חפיפה של "נה")
              let commonChars = 0;
              for (let i = 0; i < Math.min(firstNameInGett.length, firstName.length); i++) {
                if (firstNameInGett[i] === firstName[i]) commonChars++;
              }
              // אם יש חפיפה של לפחות 2 תווים או ששם המשפחה תואם בדיוק
              if (commonChars >= 2 || gettWords.some(word => word === lastName)) {
                nameMatch = true;
                matchedName = rideNameDetail.fullName;
                break;
              }
            } else if (gettWords.some(word => word === lastName)) {
              // אם רק שם המשפחה תואם, נחשב זאת כמתאים
              nameMatch = true;
              matchedName = rideNameDetail.fullName;
              break;
            }
          }
        }
      }
    }
    
    if (nameMatch) {
      return true;
    }
  }
  
  return false;
}

/**
 * התאמת בון תור עם רייד
 * לוגיקה: רק ID ומחיר - אם מתאים = matched
 * @param {Array} bontourData - מערך של נסיעות בון תור
 * @param {Array} rides - מערך של נסיעות רייד
 * @returns {Array} מערך של התאמות
 */
export function matchBontourToRides(bontourData, rides) {
  const matches = [];
  const rideMap = new Map(rides.map(r => [r.rideId, r]));
  const matchedRideIds = new Set();
  
  // עוברים על כל נסיעות בון תור (הספק הגיש לרייד)
  bontourData.forEach(bontour => {
    const rideId = bontour.orderNumber;
    const ride = rideMap.get(rideId);
    
    if (!ride) {
      // יש בבון תור אבל אין ברייד
      
      matches.push({
        supplier: 'bontour',
        supplierData: bontour,
        ride: null,
        status: 'missing_in_ride',
        priceDifference: null, // אין הפרש מחיר כשאין נסיעת רייד
        matchConfidence: 0
      });
      return;
    }
    
    // בדיקת ID ומחיר בלבד
    const priceDiff = Math.abs(ride.price - bontour.price);
    const hasPriceDifference = priceDiff > 0.01; // יותר מ-1 אגורה
    
    
    matches.push({
      supplier: 'bontour',
      supplierData: bontour,
      ride: ride,
      status: hasPriceDifference ? 'price_difference' : 'matched',
      priceDifference: priceDiff,
      matchConfidence: 1.0
    });
    
    matchedRideIds.add(rideId);
  });
  
  // הוספת נסיעות בריד שלא נמצאו בבון תור (יש ברייד אבל אין בספק)
  // רק נסיעות ששייכות לבון תור לפי שם הספק
  const bontourSupplierNames = ['בון תור', 'בוןתור', 'צוות גיל'];
  rides.forEach(ride => {
    if (!matchedRideIds.has(ride.rideId)) {
      // בדיקה אם הנסיעה שייכת לבון תור לפי שם הספק
      if (ride.supplier) {
        const rideSupplier = (ride.supplier || '').trim().toLowerCase();
        const belongsToBontour = bontourSupplierNames.some(pattern => {
          const patternLower = pattern.toLowerCase();
          return rideSupplier.includes(patternLower) || 
                 patternLower.includes(rideSupplier) ||
                 rideSupplier === patternLower;
        });
        
        if (belongsToBontour) {
      matches.push({
        supplier: 'bontour',
        supplierData: null,
        ride: ride,
        status: 'missing_in_supplier',
        priceDifference: null,
        matchConfidence: 0
      });
        }
      }
    }
  });
  
  return matches;
}

/**
 * התאמת חורי עם רייד
 * לוגיקה: רק ID ומחיר - אם מתאים = matched
 * @param {Array} horiData - מערך של נסיעות חורי
 * @param {Array} rides - מערך של נסיעות רייד
 * @returns {Array} מערך של התאמות
 */
export function matchHoriToRides(horiData, rides) {
  const matches = [];
  const rideMap = new Map(rides.map(r => [r.rideId, r]));
  const matchedRideIds = new Set();
  
  // עוברים על כל נסיעות חורי (הספק הגיש לרייד)
  horiData.forEach(hori => {
    const rideId = hori.tripNumber;
    const ride = rideMap.get(rideId);
    
    if (!ride) {
      // יש בחורי אבל אין ברייד
      matches.push({
        supplier: 'hori',
        supplierData: hori,
        ride: null,
        status: 'missing_in_ride',
        priceDifference: null,
        matchConfidence: 0
      });
      return;
    }
    
    // בדיקת ID ומחיר בלבד
    const priceDiff = Math.abs(ride.price - hori.price);
    const hasPriceDifference = priceDiff > 0.01;
    
    matches.push({
      supplier: 'hori',
      supplierData: hori,
      ride: ride,
      status: hasPriceDifference ? 'price_difference' : 'matched',
      priceDifference: priceDiff,
      matchConfidence: 1.0
    });
    
    matchedRideIds.add(rideId);
  });
  
  // הוספת נסיעות בריד שלא נמצאו בחורי (יש ברייד אבל אין בספק)
  // רק נסיעות ששייכות לחורי לפי שם הספק
  const horiSupplierNames = ['מוניות דוד חורי', 'חורי', 'דוד חורי', 'מוניות דוד חורי בעמ'];
  rides.forEach(ride => {
    if (!matchedRideIds.has(ride.rideId)) {
      // בדיקה אם הנסיעה שייכת לחורי לפי שם הספק
      if (ride.supplier) {
        const rideSupplier = (ride.supplier || '').trim().toLowerCase();
        const belongsToHori = horiSupplierNames.some(pattern => {
          const patternLower = pattern.toLowerCase();
          return rideSupplier.includes(patternLower) || 
                 patternLower.includes(rideSupplier) ||
                 rideSupplier === patternLower;
        });
        
        if (belongsToHori) {
      matches.push({
        supplier: 'hori',
        supplierData: null,
        ride: ride,
        status: 'missing_in_supplier',
        priceDifference: null,
        matchConfidence: 0
      });
        }
      }
    }
  });
  
  return matches;
}

/**
 * פונקציה עזר לפרסור תאריך ושעה
 */
function parseDateTime(dateStr, timeStr) {
  if (!dateStr) return null;
  
  let dateParts, timeParts = ['00', '00'];
  
  if (dateStr.includes(' ')) {
    const parts = dateStr.split(' ');
    dateStr = parts[0];
    timeStr = parts[1] || timeStr;
  }
  
  if (dateStr.includes('/')) {
    dateParts = dateStr.split('/');
  } else if (dateStr.includes('-')) {
    dateParts = dateStr.split('-').reverse();
  } else {
    return null;
  }
  
  if (timeStr) {
    timeParts = timeStr.split(':');
  }
  
  if (dateParts.length < 3) return null;
  
  const day = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]) - 1;
  const year = parseInt(dateParts[2]);
  const hours = parseInt(timeParts[0]) || 0;
  const minutes = parseInt(timeParts[1]) || 0;
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  
  return new Date(year, month, day, hours, minutes);
}

/**
 * מיון כרונולוגי של נסיעות
 */
function sortChronologically(items, getDate, getTime) {
  return [...items].sort((a, b) => {
    const dtA = parseDateTime(getDate(a), getTime(a));
    const dtB = parseDateTime(getDate(b), getTime(b));
    
    if (!dtA && !dtB) return 0;
    if (!dtA) return 1;
    if (!dtB) return -1;
    
    return dtA - dtB;
  });
}

/**
 * קיבוץ נסיעות לפי חודש (YYYY-MM)
 * הנסיעות נשארות ממוינות כרונולוגית בתוך כל חודש
 */
function groupRidesByMonth(rides, getDate, getTime) {
  const monthMap = new Map();
  
  rides.forEach(ride => {
    const dateStr = getDate(ride);
    const timeStr = getTime ? getTime(ride) : '';
    const dateObj = parseDateTime(dateStr, timeStr);
    
    if (!dateObj) return; // דילוג על נסיעות ללא תאריך תקין
    
    // יצירת מפתח חודש בפורמט YYYY-MM
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`;
    
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, []);
    }
    
    monthMap.get(monthKey).push(ride);
  });
  
  // מיון כל חודש כרונולוגית
  monthMap.forEach((monthRides, monthKey) => {
    monthMap.set(monthKey, sortChronologically(monthRides, getDate, getTime));
  });
  
  return monthMap;
}

/**
 * חיפוש התאמה ב-4 הנסיעות הבאות של רייד באותו חודש
 */
function findMatchInNext4RidesInMonth(
  gettRide,
  startIndex,
  monthRides,
  matchedRideIndices,
  parseDateTime,
  hasCommonPassenger,
  normalizeGettLocation,
  employeeMap
) {
  const gettDate = parseDateTime(gettRide.date, gettRide.time || '');
  if (!gettDate) {
    return null;
  }
  
  // נרמול מקור ויעד של נסיעת גט
  const gettSourceNorm = normalizeGettLocation(gettRide.source);
  const gettDestNorm = normalizeGettLocation(gettRide.destination);
  
  // חיפוש ב-4 הנסיעות הבאות (לא כולל startIndex - הנסיעה המקבילה כבר נבדקה)
  const maxSearch = Math.min(startIndex + 5, monthRides.length); // 4 נסיעות + 1 (startIndex)
  
  for (let i = startIndex + 1; i < maxSearch; i++) {
    // דילוג על נסיעות שכבר הותאמו
    if (matchedRideIndices.has(i)) {
      continue;
    }
    
    const ride = monthRides[i];
    const rideDateTime = ride.date;
    const rideTime = rideDateTime.includes(' ') ? rideDateTime.split(' ')[1] : '';
    const rideDate = rideDateTime.split(' ')[0];
    const rideDateObj = parseDateTime(rideDate, rideTime);
    
    if (!rideDateObj) {
      continue;
    }
    
    // 1. הפרש זמן ≤ 30 דקות (הוגדל מ-10 דקות)
    const timeDiff = Math.abs(rideDateObj.getTime() - gettDate.getTime()) / (1000 * 60);
    if (timeDiff > 30) {
      continue;
    }
    
    // 2. מקור ויעד זהים
    const rideSourceNorm = normalizeGettLocation(ride.source);
    const rideDestNorm = normalizeGettLocation(ride.destination);
    
    const gettDestWords = gettDestNorm.split(/\s+/).filter(w => w && w.length > 1);
    const rideDestWords = rideDestNorm.split(/\s+/).filter(w => w && w.length > 1);
    
    const sourceMatch = gettSourceNorm === rideSourceNorm ||
                       gettSourceNorm.includes(rideSourceNorm) ||
                       rideSourceNorm.includes(gettSourceNorm);
    
    const destMatch = gettDestNorm === rideDestNorm ||
                     gettDestNorm.includes(rideDestNorm) ||
                     rideDestNorm.includes(gettDestNorm) ||
                     (gettDestWords.length > 0 && rideDestWords.length > 0 &&
                      gettDestWords.every(word => rideDestNorm.includes(word)) &&
                      rideDestWords.every(word => gettDestNorm.includes(word)) &&
                      Math.abs(gettDestWords.length - rideDestWords.length) <= 2);
    
    if (!sourceMatch || !destMatch) {
      continue;
    }
    
    // 3. לפחות נוסע אחד משותף
    const hasCommon = hasCommonPassenger(ride.pids, gettRide.passengers, employeeMap);
    if (!hasCommon && ride.pids.length > 0) {
      continue;
    }
    
    // נמצאה התאמה!
    return { ride, index: i };
  }
  
  return null;
}

/**
 * נרמול מיקום לגט (כולל מספרים)
 */
function normalizeGettLocation(loc) {
  if (!loc) return '';
  let normalized = loc
    .trim()
    .replace(/[|]/g, '') // הסרת סימן |
    .replace(/\\/g, '') // הסרת backslash (כדי להתאים "25\6" עם "256")
    .replace(/`/g, '') // הסרת backtick (כדי להתאים "אצ``ל" עם "אצל")
    .replace(/"/g, '') // הסרת גרשיים (כדי להתאים "חס\"ם" עם "חסם")
    .trim();
  
  // הסרת אותיות בודדות אחרי מספרים (כמו "א" אחרי "84")
  // לדוגמה: "מכבים 84 א" -> "מכבים 84"
  // זה יעזור להתאים "מכבים 84 א" עם "מכבים 84"
  // חשוב לעשות את זה לפני החלפת ,; כי אחרת ה-א עלול להישאר
  // נחפש מספר, רווח, אות עברית, ואז רווח/פסיק/נקודה-פסיק/סוף מחרוזת
  // אם יש רווח אחרי האות ואז פסיק, נסיר גם את הרווח
  normalized = normalized.replace(/(\d+)\s+([א-ת])(\s*[,;]|\s+|$)/g, (match, num, letter, after) => {
    // אם יש פסיק/נקודה-פסיק, נסיר את הרווחים לפניו
    if (after && (after.includes(',') || after.includes(';'))) {
      return num + after.trim();
    }
    // אם יש רק רווח או סוף מחרוזת, נסיר את האות והרווח
    return num + (after === ' ' ? ' ' : (after || ''));
  });
  
  // החלפת נקודה-פסיק בפסיק
  normalized = normalized.replace(/[,;]/g, ',');
  
  // הסרת רווחים לפני פסיקים (כדי להתאים "84, שוהם" עם "84 , שוהם")
  normalized = normalized.replace(/\s+,/g, ',');
  
  // הסרת רווחים מרובים לרווח אחד
  normalized = normalized.replace(/\s+/g, ' ');
  
  // הסרת כפילות - אם יש אותו טקסט פעמיים (עם או בלי פסיק), נסיר את הכפילות
  // לדוגמה: "חסם 17 רחובות חסם 17, רחובות" -> "חסם 17, רחובות"
  // קודם נטפל בכפילות בתוך חלק אחד (בלי פסיקים)
  // נחפש מילים כפולות ברצף - אם יש רצף של מילים שמופיע פעמיים, נסיר את הכפילות
  const words = normalized.split(/\s+/);
  const deduplicatedWords = [];
  for (let i = 0; i < words.length; i++) {
    // נבדוק אם המילה הנוכחית היא תחילת רצף שמופיע פעמיים
    let isDuplicate = false;
    for (let seqLen = 1; seqLen <= Math.floor(words.length / 2) && i + seqLen * 2 <= words.length; seqLen++) {
      const seq1 = words.slice(i, i + seqLen).join(' ');
      const seq2 = words.slice(i + seqLen, i + seqLen * 2).join(' ');
      if (seq1 === seq2) {
        // מצאנו רצף כפול - נדלג על הכפילות
        i += seqLen - 1; // נעבור למילה אחרי הרצף הראשון
        isDuplicate = false; // נוסיף את הרצף הראשון
        break;
      }
    }
    if (!isDuplicate) {
      deduplicatedWords.push(words[i]);
    }
  }
  normalized = deduplicatedWords.join(' ');
  
  // עכשיו נחלק לפי פסיק, נסיר כפילויות בין חלקים, ונחבר שוב
  const parts = normalized.split(',').map(p => p.trim()).filter(p => p);
  const uniqueParts = [];
  const seen = new Set();
  for (const part of parts) {
    // נבדוק אם החלק הזה כבר קיים (בדיוק או כחלק מטקסט ארוך יותר)
    let isDuplicate = false;
    for (const seenPart of seen) {
      // אם החלק הזה זהה לחלק שכבר ראינו, או מכיל אותו, או מכוסה על ידו
      if (part === seenPart) {
        isDuplicate = true;
        break;
      }
      // אם אחד מהם מכיל את השני, נשתמש בארוך יותר
      if (part.includes(seenPart) || seenPart.includes(part)) {
        if (part.length > seenPart.length) {
          // החלק הנוכחי ארוך יותר - נחליף את החלק הישן
          const index = uniqueParts.indexOf(seenPart);
          if (index !== -1) {
            uniqueParts[index] = part;
            seen.delete(seenPart);
            seen.add(part);
          }
        }
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      uniqueParts.push(part);
      seen.add(part);
    }
  }
  normalized = uniqueParts.join(', ');
  
  // תרגום שמות רחובות באנגלית לעברית
  // "Hartum St" -> "רחוב חרות" או "חרות"
  normalized = normalized.replace(/\bHartum\s+St\b/gi, 'חרות');
  normalized = normalized.replace(/\bSt\s*\.?\s*Hartum\b/gi, 'חרות');
  // "Netanya" -> "נתניה"
  normalized = normalized.replace(/\bNetanya\b/gi, 'נתניה');
  // "Israel" -> ניתן להתעלם או להסיר
  normalized = normalized.replace(/\bIsrael\b/gi, '').trim();
  
  return normalized.trim();
}

/**
 * בדיקת התאמה בין נסיעת גט לנסיעת רייד
 */
function checkRideMatch(gettRide, ride, parseDateTime, hasCommonPassenger, normalizeGettLocation, employeeMap) {
  const gettDate = parseDateTime(gettRide.date, gettRide.time || '');
  if (!gettDate) {
    return false;
  }
  
  const rideDateTime = ride.date;
  const rideTime = rideDateTime.includes(' ') ? rideDateTime.split(' ')[1] : '';
  const rideDate = rideDateTime.split(' ')[0];
  const hasRideTime = rideDateTime.includes(' ') && rideTime.trim() !== '';
  const rideDateObj = parseDateTime(rideDate, rideTime);
  
  if (!rideDateObj) {
    return false;
  }
  
  // 1. הפרש זמן ≤ 30 דקות (הוגדל מ-10 דקות)
  // אם אין שעה ברייד, נבדוק רק אם זה אותו יום (בהפרש של עד 24 שעות)
  const timeDiff = Math.abs(rideDateObj.getTime() - gettDate.getTime()) / (1000 * 60);
  const timeDiffOK = !hasRideTime ? timeDiff <= 24 * 60 : timeDiff <= 30;
  
  if (!timeDiffOK) {
    return false;
  }
  
  // 2. מקור ויעד זהים
  const gettSourceNorm = normalizeGettLocation(gettRide.source);
  const gettDestNorm = normalizeGettLocation(gettRide.destination);
  const rideSourceNorm = normalizeGettLocation(ride.source);
  const rideDestNorm = normalizeGettLocation(ride.destination);
  
  // פונקציה עזר לבדיקה אם שני מקומות זהים (גם אם הסדר שונה)
  // מטפלת גם בקיצורים נפוצים כמו "נתבג" = "נמל התעופה בן גוריון"
  const locationsMatch = (loc1, loc2) => {
    if (loc1 === loc2) return true;
    if (loc1.includes(loc2) || loc2.includes(loc1)) return true;
    
    // החלפת קיצורים נפוצים לפני הבדיקה
    const expandAbbreviations = (loc) => {
      let expanded = loc.replace(/נתבג/g, 'נמל התעופה בן גוריון');
      // המרת "שדה תעופה בן גוריון" ל-"נמל התעופה בן גוריון" (אותו דבר)
      expanded = expanded.replace(/שדה תעופה בן גוריון/g, 'נמל התעופה בן גוריון');
      // טיפול ב-"Airport/Termin" או "Airport" באנגלית - המרה ל-"נתבג" או "נמל התעופה בן גוריון"
      // נטפל גם ב-"Terminal" או "Termin" עם מספרים (Terminal 1, Terminal 2, Terminal 3)
      expanded = expanded.replace(/\bAirport\/Termin\s*\d*\s*,?\s*Israel/gi, 'נתבג');
      expanded = expanded.replace(/\bAirport\/Terminal\s*\d*\s*,?\s*Israel/gi, 'נתבג');
      expanded = expanded.replace(/\bAirport\s*,?\s*Israel/gi, 'נתבג');
      // גם נטפל במקרים ללא "Israel"
      expanded = expanded.replace(/\bAirport\/Termin\s*\d*/gi, 'נתבג');
      expanded = expanded.replace(/\bAirport\/Terminal\s*\d*/gi, 'נתבג');
      // נסיר "Terminal" או "Termin" עם מספרים לפני "נתבג" כדי לאפשר התאמה עם טרמינלים שונים
      expanded = expanded.replace(/Terminal\s+\d+|Termin\s+\d+|טרמינל\s+\d+/gi, 'טרמינל');
      // טיפול בשמות רחובות באנגלית - המרה לעברית
      // "Hartum St" -> "רחוב חרות" או "חרות"
      expanded = expanded.replace(/\bHartum\s+St\b/gi, 'חרות');
      expanded = expanded.replace(/\bSt\s*\.?\s*Hartum\b/gi, 'חרות');
      // "Netanya" -> "נתניה"
      expanded = expanded.replace(/\bNetanya\b/gi, 'נתניה');
      // "Israel" -> ניתן להתעלם או להסיר
      expanded = expanded.replace(/\bIsrael\b/gi, '');
      return expanded.trim();
    };
    
    const loc1Expanded = expandAbbreviations(loc1);
    const loc2Expanded = expandAbbreviations(loc2);
    
    // בדיקה עם הקיצורים המורחבים
    if (loc1Expanded === loc2Expanded) return true;
    if (loc1Expanded.includes(loc2Expanded) || loc2Expanded.includes(loc1Expanded)) return true;
    
    // בדיקה מיוחדת לנתב"ג - אם שני המקומות הם נתב"ג, נתעלם ממספר הטרמינל
    const isBenGurion1 = loc1Expanded.includes('נתבג') || loc1Expanded.includes('נמל התעופה בן גוריון') || loc1Expanded.includes('שדה תעופה בן גוריון') || loc1Expanded.toLowerCase().includes('airport');
    const isBenGurion2 = loc2Expanded.includes('נתבג') || loc2Expanded.includes('נמל התעופה בן גוריון') || loc2Expanded.includes('שדה תעופה בן גוריון') || loc2Expanded.toLowerCase().includes('airport');
    if (isBenGurion1 && isBenGurion2) {
      // אם שניהם נתב"ג, נסיר מספרי טרמינלים ונשווה רק את שדה התעופה
      // נסיר רק "טרמינל X" או "Terminal X" או "Termin X" (X = מספר)
      const loc1NoTerminal = loc1Expanded.replace(/\s*[טת]?רמינל\s*\d+/gi, ' טרמינל').replace(/\s*Terminal\s*\d+/gi, ' טרמינל').replace(/\s*Termin\s*\d+/gi, ' טרמינל');
      const loc2NoTerminal = loc2Expanded.replace(/\s*[טת]?רמינל\s*\d+/gi, ' טרמינל').replace(/\s*Terminal\s*\d+/gi, ' טרמינל').replace(/\s*Termin\s*\d+/gi, ' טרמינל');
      // נבדוק אם שניהם מכילים "נתבג" או "נמל התעופה בן גוריון" או "שדה תעופה בן גוריון" או "Airport"
      const hasAirport1 = loc1NoTerminal.includes('נתבג') || loc1NoTerminal.includes('נמל התעופה בן גוריון') || loc1NoTerminal.includes('שדה תעופה בן גוריון') || loc1NoTerminal.toLowerCase().includes('airport');
      const hasAirport2 = loc2NoTerminal.includes('נתבג') || loc2NoTerminal.includes('נמל התעופה בן גוריון') || loc2NoTerminal.includes('שדה תעופה בן גוריון') || loc2NoTerminal.toLowerCase().includes('airport');
      if (hasAirport1 && hasAirport2) {
        return true; // שניהם נתב"ג, התאמה!
      }
    }
    
    // טיפול בהבדלים קטנים במספרי בתים - נסיר מספרים ונשווה רק את שמות הרחובות
    const removeNumbers = (loc) => {
      // נסיר כל המספרים מהמחרוזת
      return loc.replace(/\d+/g, '').replace(/\s+/g, ' ').replace(/,\s*,/g, ',').replace(/,\s*$/g, '').trim();
    };
    
    const loc1NoNumbers = removeNumbers(loc1Expanded);
    const loc2NoNumbers = removeNumbers(loc2Expanded);
    
    // אם אחרי הסרת המספרים יש התאמה, נשתמש בזה
    if (loc1NoNumbers && loc2NoNumbers) {
      // בדיקה אם הם זהים (בדיוק או אחד מכיל את השני)
      if (loc1NoNumbers === loc2NoNumbers || loc1NoNumbers.includes(loc2NoNumbers) || loc2NoNumbers.includes(loc1NoNumbers)) {
        return true;
      }
      // בדיקה לפי מילים - אם יש מילה משותפת משמעותית (כמו שם עיר), נשתמש בזה
      // זה מאפשר התאמה גם אם שמות הרחובות קצת שונים אבל העיר/האזור זהים
      const words1NoNumbers = loc1NoNumbers.split(/[,;\s-]+/).filter(w => w && w.length > 1);
      const words2NoNumbers = loc2NoNumbers.split(/[,;\s-]+/).filter(w => w && w.length > 1);
      // נבדוק אם יש לפחות מילה משותפת אחת משמעותית (יותר מ-2 תווים)
      const commonWords = words1NoNumbers.filter(w => w.length > 2 && words2NoNumbers.includes(w));
      if (commonWords.length > 0) {
        return true;
      }
    }
    
    // בדיקה לפי מילים - אם כל המילים ב-loc1 קיימות ב-loc2 ולהפך
    const words1 = loc1Expanded.split(/[,;\s-]+/).filter(w => w && w.length > 1);
    const words2 = loc2Expanded.split(/[,;\s-]+/).filter(w => w && w.length > 1);
    
    // נסיר מספרים מהמילים ונשווה רק את שמות הרחובות
    const words1NoNumbers = words1.map(w => w.replace(/\d+/g, '').trim()).filter(w => w && w.length > 1);
    const words2NoNumbers = words2.map(w => w.replace(/\d+/g, '').trim()).filter(w => w && w.length > 1);
    
    // בדיקה לפי מילים ללא מספרים - אם כל המילים מהמקום הקצר יותר קיימות במקום הארוך יותר
    if (words1NoNumbers.length > 0 && words2NoNumbers.length > 0) {
      const shorterWordsNoNumbers = words1NoNumbers.length <= words2NoNumbers.length ? words1NoNumbers : words2NoNumbers;
      const longerLocNoNumbers = words1NoNumbers.length <= words2NoNumbers.length ? loc2NoNumbers : loc1NoNumbers;
      const allShorterWordsInLongerNoNumbers = shorterWordsNoNumbers.every(word => longerLocNoNumbers.includes(word));
      if (allShorterWordsInLongerNoNumbers && Math.abs(words1NoNumbers.length - words2NoNumbers.length) <= 2) {
        return true;
      }
    }
    
    if (words1.length === 0 || words2.length === 0) return false;
    
    // כל המילים מהמקום הקצר יותר צריכות להיות במקום הארוך יותר
    // זה מאפשר התאמה גם כאשר אחד מהמקומות מכיל פרטים נוספים
    const shorterWords = words1.length <= words2.length ? words1 : words2;
    const longerLoc = words1.length <= words2.length ? loc2Expanded : loc1Expanded;
    const allShorterWordsInLonger = shorterWords.every(word => longerLoc.includes(word));
    
    // גם נבדוק שההבדל בכמות המילים לא גדול מדי (עד 6 מילים כדי לאפשר פרטים נוספים)
    const wordCountDiff = Math.abs(words1.length - words2.length);
    
    return allShorterWordsInLonger && wordCountDiff <= 6;
  };
  
  const sourceMatch = locationsMatch(gettSourceNorm, rideSourceNorm);
  
  const destMatch = locationsMatch(gettDestNorm, rideDestNorm);
  
  if (!sourceMatch || !destMatch) {
    return false;
  }
  
  // 3. לפחות נוסע אחד משותף
  const hasCommon = hasCommonPassenger(ride.pids, gettRide.passengers, employeeMap);
  
  if (!hasCommon && ride.pids.length > 0) {
    return false;
  }
  
  return true;
}

/**
 * התאמת גט עם רייד (התאמה חכמה לפי חודש)
 * לוגיקה: התאמה מקבילית מתחילת כל חודש - נסיעה 1 של גט עם נסיעה 1 של רייד, וכו'
 * קריטריונים: הפרש זמן ≤ 30 דקות, מקור/יעד זהה, לפחות נוסע אחד זהה
 * @param {Array} gettData - מערך של נסיעות גט
 * @param {Array} rides - מערך של נסיעות רייד
 * @param {Map|null} employeeMap - מפה של עובדים (אופציונלי)
 * @returns {Array} מערך של התאמות
 */
export function matchGettToRides(gettData, rides, employeeMap = null) {
  
  const matches = [];
  const matchedRideIds = new Set();
  
  // מיון כרונולוגי של נסיעות גט
  const sortedGett = sortChronologically(
    gettData,
    (g) => g.date,
    (g) => g.time || ''
  );
  // מיון כרונולוגי של נסיעות רייד
  const sortedRides = sortChronologically(
    rides,
    (r) => {
      const parts = r.date.split(' ');
      return parts[0] || r.date;
    },
    (r) => {
      const parts = r.date.split(' ');
      return parts[1] || '';
    }
  );
  // רק נסיעות רייד ששייכות לגט
  const gettSupplierNames = ['gett', 'גט', 'GETT'];
  const gettRides = sortedRides.filter(ride => {
    if (!ride.supplier) return false;
    const rideSupplier = (ride.supplier || '').trim().toLowerCase();
    return gettSupplierNames.some(pattern => {
      const patternLower = pattern.toLowerCase();
      return rideSupplier.includes(patternLower) || 
             patternLower.includes(rideSupplier) ||
             rideSupplier === patternLower;
    });
  });
  // קיבוץ נסיעות לפי חודש
  const gettByMonth = groupRidesByMonth(
    sortedGett,
    (g) => g.date,
    (g) => g.time || ''
  );
  
  // קיבוץ כל נסיעות הרייד לפי חודש (לא רק נסיעות גט)
  // כדי למצוא נסיעות שגט הגיש אבל ברייד מופיעות תחת ספק אחר
  const allRidesByMonth = groupRidesByMonth(
    sortedRides,
    (r) => {
      const parts = r.date.split(' ');
      return parts[0] || r.date;
    },
    (r) => {
      const parts = r.date.split(' ');
      return parts[1] || '';
    }
  );
  
  // נשמור גם את gettRides לפי חודש לשימוש בסוף (עבור missing_in_supplier)
  const ridesByMonth = groupRidesByMonth(
    gettRides,
    (r) => {
      const parts = r.date.split(' ');
      return parts[0] || r.date;
    },
    (r) => {
      const parts = r.date.split(' ');
      return parts[1] || '';
    }
  );
  
  // עבור כל חודש
  for (const [monthKey, gettMonthRides] of gettByMonth.entries()) {
    // נחפש בכל נסיעות הרייד בחודש זה (לא רק נסיעות גט)
    const rideMonthRides = allRidesByMonth.get(monthKey) || [];
    
    // Set של אינדקסים של נסיעות רייד שכבר הותאמו בחודש זה
    const matchedRideIndices = new Set();
    
    // עבור כל נסיעת גט בחודש (בסדר כרונולוגי)
    let monthMatches = 0;
    let monthMissing = 0;
    for (let i = 0; i < gettMonthRides.length; i++) {
      const gett = gettMonthRides[i];
    const gettDate = parseDateTime(gett.date, gett.time || '');
      const gettOrderNumberStr = String(gett.orderNumber || '');
      
      if (!gettDate) {
      matches.push({
        supplier: 'gett',
        supplierData: gett,
        ride: null,
        status: 'missing_in_ride',
        priceDifference: null,
        matchConfidence: 0
      });
        monthMissing++;
        continue;
      }
      
      let matchedRide = null;
      let matchedIndex = -1;
      let bestTimeDiff = Infinity;
      
      // חיפוש בכל נסיעות החודש (לא רק באינדקס i), תוך עדיפות לנסיעות קרובות יותר בזמן
      // נחפש תחילה קרוב לאינדקס i, ואז נחפש בשאר הרשימה
      const searchOrder = [];
      
      // ראשית, נחפש מאינדקס i והלאה
      for (let idx = i; idx < rideMonthRides.length; idx++) {
        if (!matchedRideIndices.has(idx)) {
          searchOrder.push(idx);
        }
      }
      
      // אם אין מספיק, נחפש גם לפני אינדקס i
      for (let idx = 0; idx < i && idx < rideMonthRides.length; idx++) {
        if (!matchedRideIndices.has(idx)) {
          searchOrder.push(idx);
        }
      }
      
      // מיון לפי הפרש זמן (עדיפות לנסיעות קרובות יותר בזמן)
      if (gettDate) {
        searchOrder.sort((a, b) => {
          const rideA = rideMonthRides[a];
          const rideB = rideMonthRides[b];
          const rideADateTime = rideA.date;
          const rideBDateTime = rideB.date;
          const rideATime = rideADateTime.includes(' ') ? rideADateTime.split(' ')[1] : '';
          const rideBTime = rideBDateTime.includes(' ') ? rideBDateTime.split(' ')[1] : '';
          const rideADate = rideADateTime.split(' ')[0];
          const rideBDate = rideBDateTime.split(' ')[0];
          const rideADateObj = parseDateTime(rideADate, rideATime);
          const rideBDateObj = parseDateTime(rideBDate, rideBTime);
          
          if (!rideADateObj) return 1;
          if (!rideBDateObj) return -1;
          
          const timeDiffA = Math.abs(rideADateObj.getTime() - gettDate.getTime());
          const timeDiffB = Math.abs(rideBDateObj.getTime() - gettDate.getTime());
          
          return timeDiffA - timeDiffB;
        });
      } else {
        // אם לא הצלחנו לפרסר את התאריך של גט, נשתמש במיון לפי index
        searchOrder.sort((a, b) => Math.abs(a - i) - Math.abs(b - i));
      }
      
      // נחפש בכל הנסיעות, אבל נעדיף את הקרובות ביותר בזמן
      for (const rideIdx of searchOrder) {
        const ride = rideMonthRides[rideIdx];
      const rideDateTime = ride.date;
      const rideTime = rideDateTime.includes(' ') ? rideDateTime.split(' ')[1] : '';
      const rideDate = rideDateTime.split(' ')[0];
        const hasRideTime = rideDateTime.includes(' ') && rideTime.trim() !== '';
      const rideDateObj = parseDateTime(rideDate, rideTime);
      
        if (!rideDateObj) continue;
        
        const timeDiff = Math.abs(rideDateObj.getTime() - gettDate.getTime()) / (1000 * 60);
        
        // אם אין שעה ברייד, נבדוק אם זה אותו יום (אז נחשיב את ההפרש כ-0 לצורך סינון)
        // אחרת, אם יש שעה, נשתמש בהפרש הזמן הרגיל
        const effectiveTimeDiff = !hasRideTime ? 0 : timeDiff;
        
        // אם כבר מצאנו התאמה עם הפרש זמן קטן יותר, נדלג על זו
        if (effectiveTimeDiff >= bestTimeDiff) continue;
        
        const checkRideMatchResult = checkRideMatch(gett, ride, parseDateTime, hasCommonPassenger, normalizeGettLocation, employeeMap);
        if (checkRideMatchResult) {
          matchedRide = ride;
          matchedIndex = rideIdx;
          // אם אין שעה ברייד, נשתמש ב-0 כדי שלא נדלג על נסיעות אחרות באותו יום
          bestTimeDiff = !hasRideTime ? 0 : timeDiff;
          
          // אם מצאנו התאמה מושלמת (הפרש זמן קטן מאוד), נפסיק לחפש
          if (timeDiff < 2) break;
        }
      }
      
      if (matchedRide) {
        // בדיקה אם הנסיעה שייכת לגט לפי שם הספק
        const rideSupplier = (matchedRide.supplier || '').trim().toLowerCase();
        const belongsToGett = gettSupplierNames.some(pattern => {
          const patternLower = pattern.toLowerCase();
          return rideSupplier.includes(patternLower) || 
                 patternLower.includes(rideSupplier) ||
                 rideSupplier === patternLower;
        });
        
        // אם הנסיעה לא שייכת לגט, זה אומר שגט הגיש את הנסיעה אבל ברייד היא מופיעה תחת ספק אחר
        // שלב 1: התאמה - הסטטוס נקבע רק לפי התאמה, לא לפי מחיר
        const status = belongsToGett ? 'matched' : 'performed_by_other_supplier';
        
        // שלב 2: חישוב הפרש מחיר (מידע נוסף, לא משנה את הסטטוס)
        const ridePrice = matchedRide.price || 0;
        const gettPrice = gett.price || 0;
        const priceDiff = Math.abs(ridePrice - gettPrice);
        
      matches.push({
        supplier: 'gett',
        supplierData: gett,
          ride: matchedRide,
          status: status, // נשאר 'matched' גם אם יש הפרש מחיר
        priceDifference: priceDiff, // הפרש המחיר הוא מידע נוסף
        matchConfidence: 1.0
      });
        matchedRideIds.add(matchedRide.rideId);
        matchedRideIndices.add(matchedIndex);
        monthMatches++;
    } else {
      // יש בגט אבל אין ברייד
      matches.push({
        supplier: 'gett',
        supplierData: gett,
        ride: null,
        status: 'missing_in_ride',
        priceDifference: null,
        matchConfidence: 0
      });
        monthMissing++;
    }
    }
  }
  
  // הוספת נסיעות בריד שלא נמצאו בגט (יש ברייד אבל אין בספק)
  let missingInSupplier = 0;
  sortedRides.forEach(ride => {
    if (!matchedRideIds.has(ride.rideId)) {
      // בדיקה אם הנסיעה שייכת לגט לפי שם הספק
      if (ride.supplier) {
        const rideSupplier = (ride.supplier || '').trim().toLowerCase();
        const belongsToGett = gettSupplierNames.some(pattern => {
          const patternLower = pattern.toLowerCase();
          return rideSupplier.includes(patternLower) || 
                 patternLower.includes(rideSupplier) ||
                 rideSupplier === patternLower;
        });
        
        if (belongsToGett) {
      matches.push({
        supplier: 'gett',
        supplierData: null,
        ride: ride,
        status: 'missing_in_supplier',
        priceDifference: null,
        matchConfidence: 0
      });
          missingInSupplier++;
        }
      }
    }
  });
  
  const totalMatched = matches.filter(m => m.status === 'matched').length;
  const totalMissingInRide = matches.filter(m => m.status === 'missing_in_ride').length;
  
  return matches;
}

/**
 * פונקציה כללית להתאמת כל הספקים
 * @param {Object} suppliersData - אובייקט עם נתוני ספקים (bontour, hori, gett)
 * @param {Array} rides - מערך של נסיעות רייד
 * @param {Map|null} employeeMap - מפה של עובדים (אופציונלי)
 * @returns {Object} אובייקט עם תוצאות התאמה לכל ספק
 */
export function matchAllSuppliers(suppliersData, rides, employeeMap = null) {
  const results = {
    bontour: [],
    hori: [],
    gett: []
  };
  
  if (suppliersData.bontour && suppliersData.bontour.length > 0) {
    results.bontour = matchBontourToRides(suppliersData.bontour, rides);
  }
  
  if (suppliersData.hori && suppliersData.hori.length > 0) {
    results.hori = matchHoriToRides(suppliersData.hori, rides);
  }
  
  if (suppliersData.gett && suppliersData.gett.length > 0) {
    results.gett = matchGettToRides(suppliersData.gett, rides, employeeMap);
  } else {
    results.gett = [];
  }
  
  return results;
}

/**
 * קבלת סטטוס טקסטואלי בעברית
 * @param {string} status - סטטוס באנגלית
 * @returns {string} סטטוס בעברית
 */
export function getStatusText(status) {
  const statusMap = {
    'matched': '✓ תואם',
    'price_difference': '✗ הפרש מחיר',
    'missing_in_ride': '⚠️ חסר ברייד',
    'missing_in_supplier': '⚠️ חסר בספק',
    'not_matched': '⚠️ לא מותאם',
    'performed_by_other_supplier': '⚠️ בוצע על ידי ספק אחר'
  };
  
  return statusMap[status] || status;
}
