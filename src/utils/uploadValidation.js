/**
 * Validates parsed upload results before marking a file as successfully loaded.
 * This prevents the UI from showing "uploaded successfully" for a syntactically
 * valid file that is actually the wrong report type for the selected slot.
 */
export function validateParsedUpload(data, fileType) {
  if (fileType === 'ride') {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('קובץ רייד לא מכיל נסיעות תקינות. ודא שזה קובץ נסיעות מרייד הכולל עמודת _ID, ולא דוח סיכום/מסד עובדים.');
    }
    return;
  }

  if (fileType === 'employees') {
    const employeeCount = data?.employeeMap instanceof Map ? data.employeeMap.size : 0;
    if (employeeCount === 0) {
      throw new Error('קובץ מסד עובדים לא מכיל עובדים תקינים. ודא שיש בקובץ עמודת _ID ועמודות שם/מחלקה.');
    }
    return;
  }

  if (['bontour', 'hori', 'gett'].includes(fileType)) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('קובץ הספק נטען אך לא זוהו בו נסיעות תקינות. ודא שהקובץ מתאים לספק שנבחר.');
    }
  }
}
