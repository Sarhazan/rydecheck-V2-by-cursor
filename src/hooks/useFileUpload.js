// React
import { useCallback } from 'react';

// Utils
import { parseFile } from '../utils/fileParser';
import { handleError } from '../utils/errorHandler';

/**
 * Hook לניהול העלאת קבצים
 * @param {Function} setFiles - פונקציה לעדכון state של קבצים
 * @param {Function} setParsedData - פונקציה לעדכון state של נתונים מפורסים
 * @param {Function} setError - פונקציה לעדכון state של שגיאות
 * @returns {Function} handleFileUpload - פונקציה לטיפול בהעלאת קובץ
 */
export function useFileUpload(setFiles, setParsedData, setError) {
  const handleFileUpload = useCallback(async (file, fileType) => {
    if (!file) {
      setFiles(prev => ({ ...prev, [fileType]: null }));
      if (fileType === 'employees') {
        setParsedData(prev => ({ ...prev, employees: [], employeeMap: new Map() }));
      } else if (fileType === 'ride') {
        setParsedData(prev => ({ ...prev, rides: [] }));
      } else {
        setParsedData(prev => ({ ...prev, [fileType]: [] }));
      }
      return;
    }

    setFiles(prev => ({ ...prev, [fileType]: file }));
    setError(null);

    try {
      const data = await parseFile(file, fileType);
      
      if (fileType === 'employees') {
        setParsedData(prev => {
          return {
            ...prev,
            employees: data.employees,
            employeeMap: data.employeeMap
          };
        });
      } else if (fileType === 'ride') {
        setParsedData(prev => {
          return { ...prev, rides: data };
        });
      } else {
        setParsedData(prev => {
          return { ...prev, [fileType]: data };
        });
      }
    } catch (err) {
      handleError(err, `טעינת קובץ ${fileType}`, setError, { fileType });
    }
  }, [setFiles, setParsedData, setError]);

  return handleFileUpload;
}
