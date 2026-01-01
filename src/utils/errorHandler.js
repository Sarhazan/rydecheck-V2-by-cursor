/**
 * מערכת ניהול שגיאות מרכזית
 */

/**
 * לוג שגיאה עם פרטים נוספים
 * @param {Error} error - אובייקט שגיאה
 * @param {string} context - הקשר השגיאה (למשל: 'fileUpload', 'analysis')
 * @param {Object} additionalInfo - מידע נוסף על השגיאה
 */
export function logError(error, context = 'unknown', additionalInfo = {}) {
  // ב-production, אפשר לשלוח לשרת לוגים
  // כרגע רק נשמור ב-console עם פרטים נוספים
  const errorDetails = {
    message: error?.message || 'Unknown error',
    stack: error?.stack,
    context,
    timestamp: new Date().toISOString(),
    ...additionalInfo
  };

  // ב-development נדפיס ל-console
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, errorDetails);
  }

  // כאן אפשר להוסיף שליחה לשרת לוגים ב-production
  // if (import.meta.env.PROD) {
  //   sendToLoggingService(errorDetails);
  // }

  return errorDetails;
}

/**
 * יצירת הודעת שגיאה ידידותית למשתמש
 * @param {Error} error - אובייקט שגיאה
 * @param {string} defaultMessage - הודעה ברירת מחדל
 * @returns {string} הודעת שגיאה ידידותית
 */
export function getUserFriendlyError(error, defaultMessage = 'אירעה שגיאה') {
  if (!error) return defaultMessage;

  // הודעות שגיאה ספציפיות
  const errorMessages = {
    'NetworkError': 'בעיית חיבור. אנא בדוק את החיבור לאינטרנט.',
    'FileReadError': 'שגיאה בקריאת הקובץ. אנא ודא שהקובץ תקין.',
    'ParseError': 'שגיאה בניתוח הקובץ. אנא ודא שהפורמט נכון.',
    'ValidationError': 'הקובץ לא עומד בדרישות. אנא בדוק את הנתונים.'
  };

  // חיפוש הודעת שגיאה ספציפית
  for (const [key, message] of Object.entries(errorMessages)) {
    if (error.message?.includes(key) || error.name === key) {
      return message;
    }
  }

  // אם יש הודעה בשגיאה, נשתמש בה
  if (error.message) {
    return error.message;
  }

  return defaultMessage;
}

/**
 * טיפול בשגיאה עם הצגה למשתמש
 * @param {Error} error - אובייקט שגיאה
 * @param {string} context - הקשר השגיאה
 * @param {Function} setError - פונקציה לעדכון state של שגיאה
 * @param {Object} additionalInfo - מידע נוסף
 */
export function handleError(error, context, setError, additionalInfo = {}) {
  // לוג השגיאה
  logError(error, context, additionalInfo);

  // עדכון state עם הודעה ידידותית
  const userMessage = getUserFriendlyError(error, `שגיאה ב-${context}`);
  setError(userMessage);
}
