import { 
  GETT_SUPPLIER_NAMES, 
  GETT_TIME_TOLERANCE_MINUTES, 
  GETT_DATE_SEARCH_RANGE_DAYS,
  GETT_MAX_SEARCH_TIME_DIFF_MINUTES,
  GETT_PERFECT_MATCH_TIME_DIFF_MINUTES
} from './gettConstants.js';

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
 * השוואת שני מיקומים מנורמלים
 * בודקת אם המיקומים זהים או דומים מספיק להתאמה
 * @param {string} loc1 - מיקום ראשון (מנורמל)
 * @param {string} loc2 - מיקום שני (מנורמל)
 * @returns {boolean} true אם המיקומים תואמים
 */
function locationsMatch(loc1, loc2) {
  if (!loc1 || !loc2) return false;
  
  // נרמול נוסף - החלפת סימנים מיוחדים והסרת "ישראל"
  const normalizeForMatch = (str) => {
    let normalized = str
      .replace(/\bישראל\b/g, '') // הסרת "ישראל"
      .replace(/[\/\-,;]/g, ' ') // החלפת /, -, ,, ; ברווח
      .replace(/\s+/g, ' ') // רווחים מרובים לרווח אחד
      .trim();
    
    // תרגום "שדה תעופה בן גוריון" ל"נתבג" כדי שיתאים (גם עם טרמינל)
    // טיפול במקרים: "שדה תעופה בן גוריון/טרמינל 3" -> "נתבג/טרמינל 3"
    normalized = normalized.replace(/\bשדה תעופה בן גוריון\s*\/\s*/g, 'נתבג/');
    normalized = normalized.replace(/\bשדה תעופה\s+בן גוריון\s*\/\s*/g, 'נתבג/');
    // גם "שדה תעופה בן גוריון - טרמינל" -> "נתבג - טרמינל"
    normalized = normalized.replace(/\bשדה תעופה בן גוריון\s*-\s*/g, 'נתבג - ');
    normalized = normalized.replace(/\bשדה תעופה\s+בן גוריון\s*-\s*/g, 'נתבג - ');
    // גם "שדה תעופה בן גוריון" (ללא טרמינל) -> "נתבג"
    normalized = normalized.replace(/\bשדה תעופה בן גוריון\b/g, 'נתבג');
    normalized = normalized.replace(/\bשדה תעופה\s+בן גוריון\b/g, 'נתבג');
    
    return normalized;
  };
  
  const norm1 = normalizeForMatch(loc1);
  const norm2 = normalizeForMatch(loc2);
  
  // בדיקה פשוטה: זהים או אחד מכיל את השני
  if (norm1 === norm2 || norm1.includes(norm2) || norm2.includes(norm1)) {
    return true;
  }
  
  // בדיקה לפי מילים משותפות (ללא תלות בסדר)
  const words1 = norm1.split(/\s+/).filter(w => w && w.length > 1);
  const words2 = norm2.split(/\s+/).filter(w => w && w.length > 1);
  
  // אם יש פחות מ-2 מילים, נשתמש בבדיקה הפשוטה
  if (words1.length < 2 || words2.length < 2) {
    return false;
  }
  
  // נסיר כפילויות ונבדוק אם לפחות 2 מילים משותפות
  const uniqueWords1 = Array.from(new Set(words1));
  const uniqueWords2 = Array.from(new Set(words2));
  const commonWords = uniqueWords1.filter(w => uniqueWords2.includes(w));
  
  // אם יש לפחות 2 מילים משותפות, נחשב שזה תואם
  if (commonWords.length >= 2) {
    return true;
  }
  
  // בדיקה נוספת: אם שתי המיקומים באותה עיר (לאחר הסרת מספרים)
  // רשימת ערים נפוצות בישראל
  const cities = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'נתניה', 'אשדוד', 'רמת גן', 'חולון', 'בני ברק', 'אשקלון', 'רחובות', 'בת ים', 'כפר סבא', 'הרצליה', 'רמלה', 'לוד', 'רעננה', 'מודיעין', 'נצרת', 'אילת', 'עכו', 'קריית גת', 'קריית שמונה', 'קריית ים', 'קריית מוצקין', 'קריית ביאליק', 'קריית אתא', 'קריית מלאכי', 'קריית אונו', 'קריית טבעון', 'ראשון לציון', 'פתח תקווה', 'רמת השרון', 'גבעתיים', 'אור יהודה', 'יהוד', 'גבעת שמואל', 'יפו'];
  
  // הסרת מספרים מהמיקומים
  const loc1WithoutNumbers = norm1.replace(/\d+/g, '').trim();
  const loc2WithoutNumbers = norm2.replace(/\d+/g, '').trim();
  
  // בדיקה אם שתי המיקומים מכילים את אותה עיר
  // אם כן, זה מתאים (הרחוב לא חשוב)
  for (const city of cities) {
    const hasCity1 = loc1WithoutNumbers.includes(city) || norm1.includes(city);
    const hasCity2 = loc2WithoutNumbers.includes(city) || norm2.includes(city);
    
    if (hasCity1 && hasCity2) {
      // אם שתי המיקומים באותה עיר, זה מתאים (הרחוב לא חשוב)
      return true;
    }
  }
  
  return false;
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
  
  // 1. חיפוש מספרים בתוך מחרוזת הנוסעים של גט
  const ridePidsSet = new Set(ridePids.map(p => p.toString()));
  const gettNumbers = gettPassengersStr.match(/\d+/g) || [];
  const numericMatch = gettNumbers.some(num => ridePidsSet.has(num));
  
  if (numericMatch) {
    return true;
  }
  
  // 2. אם יש employeeMap, ננסה למצוא התאמה לפי שמות
  if (!employeeMap || employeeMap.size === 0) {
    return false;
  }
  
  // המרת ridePids לשמות עובדים
  const rideNamesSet = new Set();
  const rideNamesDetails = [];
  ridePids.forEach(pid => {
    const emp = employeeMap.get(pid);
    if (emp) {
      const fullName = `${emp.firstName} ${emp.lastName}`.trim();
      if (fullName) {
        rideNamesSet.add(fullName.toLowerCase());
        rideNamesDetails.push({
          pid,
          fullName: fullName.toLowerCase(),
          firstName: emp.firstName ? emp.firstName.toLowerCase() : null,
          lastName: emp.lastName ? emp.lastName.toLowerCase() : null
        });
        if (emp.firstName) rideNamesSet.add(emp.firstName.toLowerCase());
        if (emp.lastName) rideNamesSet.add(emp.lastName.toLowerCase());
      }
    } else {
      rideNamesDetails.push({pid, fullName: null, firstName: null, lastName: null});
    }
  });
  
  // אם אין שמות ב-employeeMap לפי PID, ננסה לחפש ישירות ב-employeeMap
  if (rideNamesSet.size === 0) {
    const gettClean = gettPassengersStr.toLowerCase().replace(/[*|,;]/g, ' ').replace(/\s+/g, ' ').trim();
    const gettWords = gettClean.split(' ').filter(w => w && w.length > 1);
    
    // חיפוש השם ב-employeeMap
    for (const [empId, emp] of employeeMap.entries()) {
      const empFullName = `${emp.firstName} ${emp.lastName}`.trim().toLowerCase();
      const empFirstName = emp.firstName ? emp.firstName.toLowerCase().trim() : '';
      const empLastName = emp.lastName ? emp.lastName.toLowerCase().trim() : '';
      
      if (gettClean === empFullName || 
          (gettWords.length >= 2 && gettWords[0] === empFirstName && gettWords[1] === empLastName) ||
          (empFullName.includes(gettClean) || gettClean.includes(empFullName))) {
        return true;
      }
    }
    
    // אם יש שם בגט אבל לא נמצא ב-employeeMap, נחזיר true
    if (gettClean && gettClean.trim().length > 0) {
      return true;
    }
    
    return false;
  }
  
  // בדיקה אם שמות בגט תואמים לשמות ברייד
  const gettClean = gettPassengersStr.toLowerCase().replace(/[*|,;]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // התאמה מדויקת
  for (const rideName of rideNamesSet) {
    if (rideName && gettClean.includes(rideName)) {
      return true;
    }
  }
  
  // התאמה חלקית לפי שם משפחה (מטפלת בשגיאות כתיב בשם הפרטי)
  const gettWords = gettClean.split(' ').filter(w => w && w.length > 1);
  for (const rideNameDetail of rideNamesDetails) {
    if (rideNameDetail.lastName && rideNameDetail.lastName.trim()) {
      const lastName = rideNameDetail.lastName.trim();
      
      // בדיקה אם שם המשפחה מופיע בגט
      if (gettWords.some(word => word === lastName || lastName.includes(word) || word.includes(lastName))) {
        // אם יש גם שם פרטי בגט, נבדוק שהוא דומה (לפחות 2 תווים תואמים)
        const firstNameInGett = gettWords.find(word => word !== lastName && !lastName.includes(word) && !word.includes(lastName));
        if (firstNameInGett && rideNameDetail.firstName) {
          const firstName = rideNameDetail.firstName.trim();
          let commonChars = 0;
          for (let i = 0; i < Math.min(firstNameInGett.length, firstName.length); i++) {
            if (firstNameInGett[i] === firstName[i]) commonChars++;
          }
          if (commonChars >= 2 || gettWords.some(word => word === lastName)) {
            return true;
          }
        } else if (gettWords.some(word => word === lastName)) {
          // אם רק שם המשפחה תואם, נחשב זאת כמתאים
          return true;
        }
      }
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
  bontourData.forEach((bontour, idx) => {
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
  // יצירת מפה עם שני מפתחות - גם כמספר וגם כמחרוזת
  const rideMap = new Map();
  rides.forEach(r => {
    rideMap.set(r.rideId, r);
    // גם כמחרוזת למקרה ש-tripNumber הוא מחרוזת
    if (typeof r.rideId === 'number') {
      rideMap.set(String(r.rideId), r);
    } else if (typeof r.rideId === 'string') {
      const numId = parseInt(r.rideId);
      if (!isNaN(numId)) {
        rideMap.set(numId, r);
      }
    }
  });
  const matchedRideIds = new Set();
  
  // עוברים על כל נסיעות חורי (הספק הגיש לרייד)
  horiData.forEach(hori => {
    const rideId = hori.tripNumber;
    
    // בדיקה אם tripNumber תקין לפני חיפוש
    // מסננים: null, undefined, NaN, 0, מחרוזת ריקה, או כל ערך לא תקין
    const isValidTripNumber = rideId !== null && 
                              rideId !== undefined && 
                              rideId !== '' && 
                              !isNaN(rideId) && 
                              rideId !== 0 &&
                              (typeof rideId === 'number' || (typeof rideId === 'string' && rideId.trim().length > 0 && !isNaN(parseInt(rideId))));
    
    let matchedRide = null;
    let matchConfidence = 1.0;
    
    if (isValidTripNumber) {
      // ניסיון התאמה לפי tripNumber - ננסה גם כמספר וגם כמחרוזת
      matchedRide = rideMap.get(rideId);
      if (!matchedRide) {
        // ננסה כמספר אם rideId הוא מחרוזת
        if (typeof rideId === 'string') {
          const numId = parseInt(rideId);
          if (!isNaN(numId)) {
            matchedRide = rideMap.get(numId);
          }
        } else if (typeof rideId === 'number') {
          // ננסה כמחרוזת אם rideId הוא מספר
          matchedRide = rideMap.get(String(rideId));
        }
      }
    }
    
    // אם לא נמצא לפי tripNumber, ננסה התאמה לפי תאריך ומחיר 100 (רק לנסיעות עם מחיר 100)
    if (!matchedRide && hori.price === 100) {
      // חיפוש נסיעות ברייד עם מחיר 100 באותו תאריך
      const horiDate = hori.date;
      const normalizeDate = (dateStr) => {
        if (!dateStr) return '';
        // הסרת זמן אם יש
        const dateOnly = dateStr.split(' ')[0];
        return dateOnly.trim();
      };
      
      const horiDateNorm = normalizeDate(horiDate);
      
      const candidateRides = rides.filter(ride => {
        // בדיקה אם הנסיעה כבר הותאמה
        if (matchedRideIds.has(ride.rideId)) {
          return false;
        }
        
        // בדיקת מחיר
        if (Math.abs(ride.price - 100) > 0.01) {
          return false;
        }
        
        // בדיקת תאריך (אם יש)
        if (horiDateNorm && ride.date) {
          const rideDateNorm = normalizeDate(ride.date);
          if (rideDateNorm && horiDateNorm !== rideDateNorm) {
            return false;
          }
        }
        
        return true;
      });
      
      // אם יש רק מועמד אחד, נבחר אותו
      if (candidateRides.length === 1) {
        matchedRide = candidateRides[0];
        matchConfidence = 0.8; // ביטחון נמוך יותר אם התאמנו לפי תאריך
      }
    }
    
    if (!matchedRide) {
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
    const priceDiff = Math.abs(matchedRide.price - hori.price);
    const hasPriceDifference = priceDiff > 0.01;
    
    matches.push({
      supplier: 'hori',
      supplierData: hori,
      ride: matchedRide,
      status: hasPriceDifference ? 'price_difference' : 'matched',
      priceDifference: priceDiff,
      matchConfidence: matchConfidence
    });
    
    matchedRideIds.add(matchedRide.rideId);
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
 * הסרת תווים מיוחדים ממיקום
 * @param {string} loc - מיקום לניקוי
 * @returns {string} מיקום ללא תווים מיוחדים
 */
function removeSpecialCharacters(loc) {
  if (!loc) return '';
  return loc
    .trim()
    .replace(/[|]/g, '') // הסרת סימן |
    .replace(/\\/g, '') // הסרת backslash
    .replace(/`/g, '') // הסרת backtick
    .replace(/"/g, '') // הסרת גרשיים
    .trim();
}

/**
 * הסרת אותיות בודדות אחרי מספרים (למשל "84 א" -> "84")
 * @param {string} loc - מיקום לניקוי
 * @returns {string} מיקום ללא אותיות בודדות אחרי מספרים
 */
function removeSingleLettersAfterNumbers(loc) {
  if (!loc) return '';
  return loc.replace(/(\d+)\s+([א-ת])(\s*[,;]|\s+|$)/g, (match, num, letter, after) => {
    if (after && (after.includes(',') || after.includes(';'))) {
      return num + after.trim();
    }
    return num + (after === ' ' ? ' ' : (after || ''));
  });
}

/**
 * איחוד סימני פיסוק - החלפת נקודה-פסיק בפסיק וניקוי רווחים
 * @param {string} loc - מיקום לניקוי
 * @returns {string} מיקום עם סימני פיסוק מאוחדים
 */
function normalizePunctuation(loc) {
  if (!loc) return '';
  return loc
    .replace(/[,;]/g, ',') // החלפת נקודה-פסיק בפסיק
    .replace(/\s+,/g, ',') // הסרת רווחים לפני פסיקים
    .replace(/\s+/g, ' '); // רווחים מרובים לרווח אחד
}

/**
 * הסרת כפילויות ברצף מילים
 * @param {string} loc - מיקום לניקוי
 * @returns {string} מיקום ללא כפילויות ברצף
 */
function removeDuplicateWords(loc) {
  if (!loc) return '';
  const words = loc.split(/\s+/);
  const deduplicatedWords = [];
  for (let i = 0; i < words.length; i++) {
    let isDuplicate = false;
    for (let seqLen = 1; seqLen <= Math.floor(words.length / 2) && i + seqLen * 2 <= words.length; seqLen++) {
      const seq1 = words.slice(i, i + seqLen).join(' ');
      const seq2 = words.slice(i + seqLen, i + seqLen * 2).join(' ');
      if (seq1 === seq2) {
        i += seqLen - 1;
        isDuplicate = false;
        break;
      }
    }
    if (!isDuplicate) {
      deduplicatedWords.push(words[i]);
    }
  }
  return deduplicatedWords.join(' ');
}

/**
 * הסרת כפילויות בין חלקים מופרדים בפסיק
 * @param {string} loc - מיקום לניקוי
 * @returns {string} מיקום ללא כפילויות בין חלקים
 */
function removeDuplicateParts(loc) {
  if (!loc) return '';
  const parts = loc.split(',').map(p => p.trim()).filter(p => p);
  const uniqueParts = [];
  const seen = new Set();
  for (const part of parts) {
    let isDuplicate = false;
    for (const seenPart of seen) {
      if (part === seenPart) {
        isDuplicate = true;
        break;
      }
      if (part.includes(seenPart) || seenPart.includes(part)) {
        if (part.length > seenPart.length) {
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
  return uniqueParts.join(', ');
}

/**
 * תרגום שמות באנגלית לעברית
 * @param {string} loc - מיקום לתרגום
 * @returns {string} מיקום מתורגם
 */
function translateEnglishToHebrew(loc) {
  if (!loc) return '';
  return loc
    .replace(/\bHartum\s+St\b/gi, 'חרות')
    .replace(/\bSt\s*\.?\s*Hartum\b/gi, 'חרות')
    .replace(/\bNetanya\b/gi, 'נתניה')
    .replace(/\bRa'?anana\b/gi, 'רעננה')
    .replace(/\bIsrael\b/gi, '')
    .trim();
}

/**
 * הרחבת קיצורים (נתבג, בן גוריון)
 * @param {string} loc - מיקום להרחבה
 * @returns {string} מיקום עם קיצורים מורחבים
 */
function expandAbbreviations(loc) {
  if (!loc) return '';
  let expanded = loc;
  
  // "נתבג" -> "שדה תעופה בן גוריון" (גם עם טרמינל)
  // נתבג - טרמינל -> שדה תעופה בן גוריון - טרמינל
  expanded = expanded.replace(/(^|\s)נתבג\s*-\s*/g, '$1שדה תעופה בן גוריון - ');
  // נתבג/טרמינל -> שדה תעופה בן גוריון/טרמינל
  expanded = expanded.replace(/(^|\s)נתבג\s*\/\s*/g, '$1שדה תעופה בן גוריון/');
  expanded = expanded.replace(/(^|\s)נתבג(\s|$|,)/g, '$1שדה תעופה בן גוריון$2');
  
  // "בן גוריון" -> "שדה תעופה בן גוריון" רק אם זה באמת שדה תעופה
  // לא נתרגם אם יש מספר אחרי "בן גוריון" (כמו "בן גוריון 3" = רחוב)
  // ולא נתרגם אם זה חלק ממיקום שכבר מכיל עיר אחרת (כמו "בן גוריון 3 ; רמלה")
  if (expanded.includes('בן גוריון') && !expanded.includes('שדה תעופה')) {
    // נבדוק אם "בן גוריון" מופיע עם מספר אחריו (כמו "בן גוריון 3")
    const hasNumberAfter = /\bבן גוריון\s+\d+/.test(expanded);
    
    // נבדוק אם יש עיר אחרי הפסיק (למשל "בן גוריון 3, רמלה")
    const parts = expanded.split(',');
    const hasCityAfter = parts.length > 1 && parts[1].trim().length > 0;
    
    // רשימת ערים נפוצות לזיהוי
    const cities = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'נתניה', 'אשדוד', 'רמת גן', 'חולון', 'בני ברק', 'אשקלון', 'רחובות', 'בת ים', 'כפר סבא', 'הרצליה', 'רמלה', 'לוד', 'רעננה', 'מודיעין', 'נצרת', 'אילת', 'עכו', 'קריית גת', 'קריית שמונה', 'קריית ים', 'קריית מוצקין', 'קריית ביאליק', 'קריית אתא', 'קריית מלאכי', 'קריית אונו', 'קריית טבעון', 'ראשון לציון', 'פתח תקווה', 'רמת השרון', 'גבעתיים', 'אור יהודה', 'יהוד', 'גבעת שמואל'];
    const hasKnownCityAfter = parts.length > 1 && cities.some(city => parts[1].trim().includes(city));
    
    // נתרגם רק אם אין מספר אחרי ואין עיר אחרי הפסיק (כלומר זה באמת שדה תעופה)
    if (!hasNumberAfter && !hasCityAfter && !hasKnownCityAfter) {
      expanded = expanded.replace(/(^|\s)בן גוריון(\s|$|,|-)/g, '$1שדה תעופה בן גוריון$2');
    }
  }
  
  return expanded;
}

/**
 * נרמול מיקום לגט
 * מטפל בתווים מיוחדים, כפילויות, תרגומים וקיצורים
 * @param {string} loc - מיקום לנרמול
 * @returns {string} מיקום מנורמל
 */
function normalizeGettLocation(loc) {
  if (!loc) return '';
  
  let normalized = removeSpecialCharacters(loc);
  normalized = removeSingleLettersAfterNumbers(normalized);
  normalized = normalizePunctuation(normalized);
  normalized = removeDuplicateWords(normalized);
  normalized = removeDuplicateParts(normalized);
  normalized = translateEnglishToHebrew(normalized);
  normalized = expandAbbreviations(normalized);
  
  return normalized.trim();
}

/**
 * פרסור תאריך ושעה של נסיעת גט
 * @param {Object} gettRide - נסיעת גט
 * @param {Function} parseDateTime - פונקציה לפרסור תאריכים
 * @returns {Date|null} תאריך ושעה או null אם לא ניתן לפרסר
 */
function parseGettDateTime(gettRide, parseDateTime) {
  return parseDateTime(gettRide.date, gettRide.time || '');
}

/**
 * פרסור תאריך ושעה של נסיעת רייד
 * @param {Object} ride - נסיעת רייד
 * @param {Function} parseDateTime - פונקציה לפרסור תאריכים
 * @returns {Date|null} תאריך ושעה או null אם לא ניתן לפרסר
 */
function parseRideDateTime(ride, parseDateTime) {
  const rideDateTime = ride.date;
  const rideTime = rideDateTime.includes(' ') ? rideDateTime.split(' ')[1] : '';
  const rideDate = rideDateTime.split(' ')[0];
  return parseDateTime(rideDate, rideTime);
}

/**
 * בדיקת התאמת זמן בין שתי נסיעות
 * @param {Date} gettDate - תאריך נסיעת גט
 * @param {Date} rideDate - תאריך נסיעת רייד
 * @param {number} maxDiffMinutes - הפרש זמן מקסימלי (בדקות)
 * @returns {boolean} true אם הפרש הזמן קטן או שווה למקסימום
 */
function checkTimeMatch(gettDate, rideDate, maxDiffMinutes = GETT_TIME_TOLERANCE_MINUTES) {
  if (!gettDate || !rideDate) {
    return false;
  }
  const timeDiff = Math.abs(rideDate.getTime() - gettDate.getTime()) / (1000 * 60);
  return timeDiff <= maxDiffMinutes;
}

/**
 * בדיקת התאמת מיקום בין נסיעת גט לנסיעת רייד
 * @param {Object} gettRide - נסיעת גט
 * @param {Object} ride - נסיעת רייד
 * @param {Function} normalizeGettLocation - פונקציה לנרמול מיקומים
 * @returns {boolean} true אם מקור ויעד תואמים
 */
function checkLocationMatch(gettRide, ride, normalizeGettLocation) {
  const gettSourceNorm = normalizeGettLocation(gettRide.source);
  const gettDestNorm = normalizeGettLocation(gettRide.destination);
  const rideSourceNorm = normalizeGettLocation(ride.source);
  const rideDestNorm = normalizeGettLocation(ride.destination);
  
  const sourceMatch = locationsMatch(gettSourceNorm, rideSourceNorm);
  const destMatch = locationsMatch(gettDestNorm, rideDestNorm);
  
  return sourceMatch && destMatch;
}

/**
 * בדיקת התאמת נוסעים בין נסיעת גט לנסיעת רייד
 * @param {Object} ride - נסיעת רייד
 * @param {Object} gettRide - נסיעת גט
 * @param {Map} employeeMap - מפה של עובדים
 * @param {Function} hasCommonPassenger - פונקציה לבדיקת נוסעים משותפים
 * @returns {boolean} true אם יש לפחות נוסע אחד משותף
 */
function checkPassengerMatch(ride, gettRide, employeeMap, hasCommonPassenger) {
  const hasCommon = hasCommonPassenger(ride.pids, gettRide.passengers, employeeMap);
  // אם אין נוסעים משותפים ויש נוסעים ברייד, אין התאמה
  if (!hasCommon && ride.pids.length > 0) {
    return false;
  }
  return true;
}

/**
 * בדיקת התאמה בין נסיעת גט לנסיעת רייד
 * קריטריונים: הפרש זמן ≤ 10 דקות, מקור/יעד זהים, לפחות נוסע אחד זהה
 * @param {Object} gettRide - נסיעת גט
 * @param {Object} ride - נסיעת רייד
 * @param {Function} parseDateTime - פונקציה לפרסור תאריכים
 * @param {Function} hasCommonPassenger - פונקציה לבדיקת נוסעים משותפים
 * @param {Function} normalizeGettLocation - פונקציה לנרמול מיקומים
 * @param {Map} employeeMap - מפה של עובדים
 * @returns {boolean} true אם כל הקריטריונים מתקיימים
 */
function checkRideMatch(gettRide, ride, parseDateTime, hasCommonPassenger, normalizeGettLocation, employeeMap) {
  // 1. פרסור תאריכים
  const gettDate = parseGettDateTime(gettRide, parseDateTime);
  if (!gettDate) {
    return false;
  }
  
  const rideDateObj = parseRideDateTime(ride, parseDateTime);
  if (!rideDateObj) {
    return false;
  }
  
  // 2. בדיקת מיקומים - מקור ויעד זהים
  const locationMatch = checkLocationMatch(gettRide, ride, normalizeGettLocation);
  if (!locationMatch) {
    return false;
  }
  
  // 3. בדיקת נוסעים - לפחות נוסע אחד משותף
  const passengerMatch = checkPassengerMatch(ride, gettRide, employeeMap, hasCommonPassenger);
  if (!passengerMatch) {
    return false;
  }
  
  // 4. בדיקת זמן - הפרש זמן ≤ 10 דקות
  const timeMatch = checkTimeMatch(gettDate, rideDateObj, 10);
  if (!timeMatch) {
    return false;
  }
  
  return true;
}

/**
 * יצירת מפת נסיעות לפי תאריך (רק יום, ללא שעה) לייעול החיפוש
 * @param {Array} rides - מערך של נסיעות רייד
 * @param {Function} parseDateTime - פונקציה לפרסור תאריכים
 * @returns {Map<string, Array>} מפה של נסיעות לפי מפתח תאריך (YYYY-MM-DD)
 */
function buildRidesByDateMap(rides, parseDateTime) {
  const ridesByDate = new Map();
  for (const ride of rides) {
    const rideDateTime = ride.date;
    const rideTime = rideDateTime.includes(' ') ? rideDateTime.split(' ')[1] : '';
    const rideDate = rideDateTime.split(' ')[0];
    const rideDateObj = parseDateTime(rideDate, rideTime);
    
    if (rideDateObj) {
      // מפתח: YYYY-MM-DD (רק תאריך, ללא שעה)
      const dateKey = `${rideDateObj.getFullYear()}-${String(rideDateObj.getMonth() + 1).padStart(2, '0')}-${String(rideDateObj.getDate()).padStart(2, '0')}`;
      
      if (!ridesByDate.has(dateKey)) {
        ridesByDate.set(dateKey, []);
      }
      ridesByDate.get(dateKey).push(ride);
    }
  }
  return ridesByDate;
}

/**
 * מציאת נסיעות מועמדות לפי תאריך (יום לפני, אותו יום, יום אחרי)
 * @param {Date} gettDate - תאריך נסיעת גט
 * @param {Map<string, Array>} ridesByDate - מפה של נסיעות לפי תאריך
 * @param {number} dayRange - טווח ימים לחיפוש (ברירת מחדל: 1)
 * @returns {Array} מערך של נסיעות מועמדות
 */
function findCandidateRides(gettDate, ridesByDate, dayRange = 1) {
  const candidateRides = [];
  for (let dayOffset = -dayRange; dayOffset <= dayRange; dayOffset++) {
    const checkDate = new Date(gettDate);
    checkDate.setDate(checkDate.getDate() + dayOffset);
    const checkDateKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    
    if (ridesByDate.has(checkDateKey)) {
      const ridesForDate = ridesByDate.get(checkDateKey);
      candidateRides.push(...ridesForDate);
    }
  }
  return candidateRides;
}

/**
 * מציאת ההתאמה הטובה ביותר בין נסיעת גט לנסיעות מועמדות
 * @param {Object} gettRide - נסיעת גט
 * @param {Array} candidateRides - נסיעות מועמדות
 * @param {Set} matchedRideIds - Set של ID-ים של נסיעות שכבר הותאמו
 * @param {Function} parseDateTime - פונקציה לפרסור תאריכים
 * @param {Function} checkRideMatch - פונקציה לבדיקת התאמה
 * @param {Map|null} employeeMap - מפה של עובדים (אופציונלי)
 * @param {number} maxSearchTimeDiff - הפרש זמן מקסימלי לחיפוש (בדקות)
 * @param {number} perfectMatchTimeDiff - הפרש זמן להתאמה מושלמת (בדקות)
 * @returns {Object|null} נסיעת רייד מותאמת או null
 */
function findBestGettMatch(gettRide, candidateRides, matchedRideIds, parseDateTime, checkRideMatch, employeeMap, maxSearchTimeDiff = GETT_MAX_SEARCH_TIME_DIFF_MINUTES, perfectMatchTimeDiff = GETT_PERFECT_MATCH_TIME_DIFF_MINUTES) {
  const gettDate = parseDateTime(gettRide.date, gettRide.time || '');
  if (!gettDate) {
    return null;
  }
  
  const gettOrderNumber = gettRide.orderNumber || gettRide.orderId;
  const gettOrderNumberStr = gettOrderNumber ? String(gettOrderNumber).trim() : null;
  
  let matchedRide = null;
  let bestTimeDiff = Infinity;
  let hasOrderNumberMatch = false; // האם יש התאמה לפי מספר הזמנה
  
  for (const ride of candidateRides) {
    // דילוג על נסיעות שכבר הותאמו
    if (matchedRideIds.has(ride.rideId)) {
      continue;
    }
    
    // בדיקה אם יש התאמה לפי מספר הזמנה של גט
    // נבדוק בשדות שונים בנסיעת הרייד
    const rideOrderNumber = ride.supplierOrderNumber || ride.orderNumber || ride.orderId;
    const orderNumberMatch = gettOrderNumber && rideOrderNumber && 
                             String(gettOrderNumber).trim() === String(rideOrderNumber).trim();
    
    // אם יש התאמה לפי מספר הזמנה, זה עדיפות גבוהה מאוד
    // אבל עדיין צריך לבדוק את שאר הקריטריונים (מיקום, נוסעים, זמן)
    if (orderNumberMatch && !hasOrderNumberMatch) {
      // אם יש התאמה לפי מספר הזמנה, נבדוק את שאר הקריטריונים
      const matchResult = checkRideMatch(gettRide, ride, parseDateTime, hasCommonPassenger, normalizeGettLocation, employeeMap);
      if (matchResult) {
        // אם כל הקריטריונים מתקיימים, זו התאמה מושלמת
        matchedRide = ride;
        hasOrderNumberMatch = true;
        // נמשיך לחפש התאמות אחרות לפי מספר הזמנה, אבל רק אם הן טובות יותר
        continue;
      }
    }
    
    // אם כבר יש התאמה לפי מספר הזמנה, נדלג על נסיעות ללא התאמה לפי מספר הזמנה
    if (hasOrderNumberMatch && !orderNumberMatch) {
      continue;
    }
    
    // חילוץ תאריך ושעה מהנסיעה
    const rideDateTime = ride.date;
    const rideTime = rideDateTime.includes(' ') ? rideDateTime.split(' ')[1] : '';
    const rideDate = rideDateTime.split(' ')[0];
    const rideDateObj = parseDateTime(rideDate, rideTime);
    
    if (!rideDateObj) {
      continue;
    }
    
    // חישוב הפרש זמן
    const timeDiff = Math.abs(rideDateObj.getTime() - gettDate.getTime()) / (1000 * 60);
    
    // אם הפרש הזמן גדול מהמקסימום, נדלג
    if (timeDiff > maxSearchTimeDiff) {
      continue;
    }
    
    // בדיקת התאמה - צריך לבדוק לפני השוואת bestTimeDiff
    // כי אם יש נסיעה עם הפרש זמן קטן יותר שלא עוברת את checkRideMatch,
    // אנחנו עדיין רוצים לבדוק נסיעות אחרות שעוברות את checkRideMatch
    const matchResult = checkRideMatch(gettRide, ride, parseDateTime, hasCommonPassenger, normalizeGettLocation, employeeMap);
    
    // אם לא עברה את checkRideMatch, נדלג
    if (!matchResult) {
      continue;
    }
    
    // אם יש התאמה לפי מספר הזמנה, זו עדיפות גבוהה
    if (orderNumberMatch) {
      if (!hasOrderNumberMatch || timeDiff < bestTimeDiff) {
        matchedRide = ride;
        bestTimeDiff = timeDiff;
        hasOrderNumberMatch = true;
      }
      continue;
    }
    
    // אם כבר יש התאמה לפי מספר הזמנה, נדלג על נסיעות ללא התאמה לפי מספר הזמנה
    if (hasOrderNumberMatch) {
      continue;
    }
    
    // אם הפרש הזמן גדול יותר מהטוב ביותר הנוכחי, נדלג על זו
    // אבל אם יש התאמה עם אותו הפרש זמן, נבדוק גם את זו כדי לבחור את הטובה ביותר
    if (timeDiff > bestTimeDiff) {
      continue;
    }
    
    // עדכון ההתאמה הטובה ביותר אם הפרש הזמן קטן יותר או שווה
    // אם יש שתי נסיעות עם אותו הפרש זמן, נבחר את הראשונה (הסדר ברשימה)
    if (timeDiff <= bestTimeDiff) {
      matchedRide = ride;
      bestTimeDiff = timeDiff;
    }
  }
  
  return matchedRide;
}

/**
 * יצירת אובייקט תוצאת התאמה
 * @param {Object} gettRide - נסיעת גט
 * @param {Object|null} ride - נסיעת רייד (או null אם לא נמצאה)
 * @param {string} status - סטטוס ההתאמה
 * @returns {Object} אובייקט תוצאת התאמה
 */
function createGettMatchResult(gettRide, ride, status) {
  const result = {
    supplier: 'gett',
    supplierData: gettRide,
    ride: ride,
    status: status,
    matchConfidence: status === 'matched' ? 1.0 : 0
  };
  
  if (status === 'matched' && ride) {
    const ridePrice = ride.price || 0;
    const gettPrice = gettRide.price || 0;
    result.priceDifference = Math.abs(ridePrice - gettPrice);
  } else {
    result.priceDifference = null;
  }
  
  return result;
}

/**
 * הוספת נסיעות רייד שלא נמצאו בגט (יש ברייד אבל אין בספק)
 * @param {Array} rides - מערך של נסיעות רייד
 * @param {Set} matchedRideIds - Set של ID-ים של נסיעות שכבר הותאמו
 * @param {Array<string>} gettSupplierNames - שמות הספק גט
 * @returns {Array} מערך של תוצאות התאמה לנסיעות חסרות
 */
function addMissingRideMatches(rides, matchedRideIds, gettSupplierNames) {
  const missingMatches = [];
  
  for (const ride of rides) {
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
          missingMatches.push(createGettMatchResult(null, ride, 'missing_in_supplier'));
        }
      }
    }
  }
  
  return missingMatches;
}

/**
 * התאמת גט עם רייד
 * קריטריונים: הפרש זמן ≤ 10 דקות, מקור/יעד זהה, לפחות נוסע אחד זהה
 * @param {Array} gettData - מערך של נסיעות גט
 * @param {Array} rides - מערך של נסיעות רייד
 * @param {Map|null} employeeMap - מפה של עובדים (אופציונלי)
 * @returns {Array} מערך של התאמות
 */
export function matchGettToRides(gettData, rides, employeeMap = null) {
  const matches = [];
  const matchedRideIds = new Set();
  const gettSupplierNames = GETT_SUPPLIER_NAMES;
  
  // יצירת מפה של נסיעות לפי תאריך
  const ridesByDate = buildRidesByDateMap(rides, parseDateTime);
  
  // יצירת מפה של נסיעות לפי מספר הזמנה של גט (אם קיים)
  const ridesByGettOrderNumber = new Map();
  for (const ride of rides) {
    const orderNumber = ride.supplierOrderNumber || ride.orderNumber || ride.orderId;
    if (orderNumber) {
      const orderNumberStr = String(orderNumber).trim();
      if (!ridesByGettOrderNumber.has(orderNumberStr)) {
        ridesByGettOrderNumber.set(orderNumberStr, []);
      }
      ridesByGettOrderNumber.get(orderNumberStr).push(ride);
    }
  }
  
  // עבור כל נסיעת גט - מיון לפי מספר הזמנה (אם יש) כדי לתת עדיפות לנסיעות עם מספר הזמנה
  const sortedGettData = [...gettData].sort((a, b) => {
    const aHasOrderNumber = !!(a.orderNumber || a.orderId);
    const bHasOrderNumber = !!(b.orderNumber || b.orderId);
    // נסיעות עם מספר הזמנה קודם
    if (aHasOrderNumber && !bHasOrderNumber) return -1;
    if (!aHasOrderNumber && bHasOrderNumber) return 1;
    return 0;
  });
  
  // עבור כל נסיעת גט
  for (const gettRide of sortedGettData) {
    const gettOrderNumber = gettRide.orderNumber || gettRide.orderId;
    const gettOrderNumberStr = gettOrderNumber ? String(gettOrderNumber).trim() : null;
    
    // פרסור תאריך של נסיעת גט
    const gettDate = parseDateTime(gettRide.date, gettRide.time || '');
    
    // אם אין תאריך תקין, נסיעת גט לא נמצאה ברייד
    if (!gettDate) {
      matches.push(createGettMatchResult(gettRide, null, 'missing_in_ride'));
      continue;
    }
    
    let matchedRide = null;
    
    // קודם כל, נבדוק אם יש נסיעת רייד עם מספר הזמנה של גט
    // אם יש מספר הזמנה, נחפש את הנסיעה גם אם היא כבר הותאמה (כדי לתת עדיפות)
    if (gettOrderNumberStr && ridesByGettOrderNumber.has(gettOrderNumberStr)) {
      const ridesWithOrderNumber = ridesByGettOrderNumber.get(gettOrderNumberStr);
      // נבדוק את כל הנסיעות עם מספר הזמנה הזה
      for (const ride of ridesWithOrderNumber) {
        // אם הנסיעה כבר הותאמה, נבדוק אם היא הותאמה לנסיעת גט אחרת
        // אם כן, נשחרר אותה ונעדכן את ההתאמה הישנה
        if (matchedRideIds.has(ride.rideId)) {
          // אם יש מספר הזמנה של גט, נשחרר את הנסיעה מההתאמה הישנה ונעדכן אותה
          // נחפש את ההתאמה הישנה ונעדכן אותה
          const oldMatchIndex = matches.findIndex(m => 
            m.ride && m.ride.rideId === ride.rideId && 
            m.status === 'matched' &&
            m.supplierData &&
            (m.supplierData.orderNumber !== gettOrderNumberStr && m.supplierData.orderId !== gettOrderNumberStr)
          );
          
          if (oldMatchIndex !== -1) {
            // עדכון ההתאמה הישנה ל-missing_in_ride
            matches[oldMatchIndex] = createGettMatchResult(matches[oldMatchIndex].supplierData, null, 'missing_in_ride');
            // הסרת הנסיעה מה-matchedRideIds כדי שנוכל להתאים אותה מחדש
            matchedRideIds.delete(ride.rideId);
          } else {
            // אם לא מצאנו התאמה ישנה, נדלג על הנסיעה
            continue;
          }
        }
        
        // בדיקת התאמה - אם יש מספר הזמנה, נבדוק את שאר הקריטריונים
        const matchResult = checkRideMatch(gettRide, ride, parseDateTime, hasCommonPassenger, normalizeGettLocation, employeeMap);
        if (matchResult) {
          matchedRide = ride;
          break; // מצאנו התאמה לפי מספר הזמנה
        }
      }
    }
    
    // אם לא מצאנו התאמה לפי מספר הזמנה, נחפש התאמה רגילה
    if (!matchedRide) {
      // מציאת נסיעות מועמדות
      const candidateRides = findCandidateRides(gettDate, ridesByDate, GETT_DATE_SEARCH_RANGE_DAYS);
      
      // מציאת ההתאמה הטובה ביותר
      matchedRide = findBestGettMatch(
        gettRide,
        candidateRides,
        matchedRideIds,
        parseDateTime,
        checkRideMatch,
        employeeMap,
        GETT_MAX_SEARCH_TIME_DIFF_MINUTES, // maxSearchTimeDiff
        GETT_PERFECT_MATCH_TIME_DIFF_MINUTES   // perfectMatchTimeDiff
      );
    }
    
    // הוספת תוצאת ההתאמה
    if (matchedRide) {
      matches.push(createGettMatchResult(gettRide, matchedRide, 'matched'));
      matchedRideIds.add(matchedRide.rideId);
    } else {
      // יש בגט אבל אין ברייד
      matches.push(createGettMatchResult(gettRide, null, 'missing_in_ride'));
    }
  }
  
  // הוספת נסיעות רייד שלא נמצאו בגט
  const missingMatches = addMissingRideMatches(rides, matchedRideIds, gettSupplierNames);
  matches.push(...missingMatches);
  
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
    'not_matched': '⚠️ לא מותאם'
  };
  
  return statusMap[status] || status;
}



