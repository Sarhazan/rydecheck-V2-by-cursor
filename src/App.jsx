// React
import { useState, useCallback, lazy, Suspense } from 'react';

// Framer Motion
import { motion, AnimatePresence } from 'framer-motion';

// Components
import FileUpload from './components/FileUpload';

// Utils
import { parseFile } from './utils/fileParser';
import { matchAllSuppliers } from './utils/rideMatcher';
import { calculateDepartmentBreakdown } from './utils/departmentCalculator';
import { generateAllDemoData } from './utils/demoDataGenerator';

// Icons
import { Loader2, FileText, BarChart3, Download, Trash2, Play, AlertCircle } from 'lucide-react';

// Lazy loading for heavy components
const AnalysisResults = lazy(() => import('./components/AnalysisResults'));
const DepartmentBreakdown = lazy(() => import('./components/DepartmentBreakdown'));
const ZeroPriceRides = lazy(() => import('./components/ZeroPriceRides'));

// Lazy loading for excel exporter (only loaded when needed)
const loadExcelExporter = () => import('./utils/excelExporter');

function App() {
  const [files, setFiles] = useState({
    ride: null,
    bontour: null,
    hori: null,
    gett: null,
    employees: null
  });

  const [parsedData, setParsedData] = useState({
    rides: [],
    employees: [],
    employeeMap: new Map(),
    bontour: [],
    hori: [],
    gett: []
  });

  const [matchResults, setMatchResults] = useState(null);
  const [departmentData, setDepartmentData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

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
        setParsedData(prev => ({
          ...prev,
          employees: data.employees,
          employeeMap: data.employeeMap
        }));
      } else if (fileType === 'ride') {
        setParsedData(prev => ({ ...prev, rides: data }));
      } else {
        setParsedData(prev => ({ ...prev, [fileType]: data }));
      }
    } catch (err) {
      setError(`שגיאה בטעינת קובץ ${fileType}: ${err.message}`);
      console.error(err);
    }
  }, []);

  const loadDemoData = useCallback(async () => {
    try {
      setError(null);
      setIsAnalyzing(true);
      
      // יצירת נתוני דמו אקראיים
      const demoData = generateAllDemoData();
      
      // עדכון state עם הנתונים
      setParsedData({
        rides: demoData.rides,
        employees: demoData.employees,
        employeeMap: demoData.employeeMap,
        bontour: demoData.bontour,
        hori: demoData.hori,
        gett: demoData.gett
      });
      
      // עדכון files state (רק לצורך הצגה, לא קבצים אמיתיים)
      setFiles({
        ride: { name: 'קובץ רייד דמו.csv' },
        bontour: { name: 'בון תור דמו.xlsx' },
        hori: { name: 'חורי דמו.xlsx' },
        gett: { name: 'גט דמו.xlsx' },
        employees: { name: 'מסד עובדים דמו.csv' }
      });
      
    } catch (err) {
      setError(`שגיאה בטעינת נתוני דמו: ${err.message}`);
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setFiles({
      ride: null,
      bontour: null,
      hori: null,
      gett: null,
      employees: null
    });
    setParsedData({
      rides: [],
      employees: [],
      employeeMap: new Map(),
      bontour: [],
      hori: [],
      gett: []
    });
    setMatchResults(null);
    setDepartmentData(null);
    setError(null);
  }, []);

  const runAnalysis = useCallback(async () => {
    if (parsedData.rides.length === 0) {
      setError('אנא טען קובץ רייד');
      return;
    }

    if (parsedData.employeeMap.size === 0) {
      setError('אנא טען קובץ מסד עובדים');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);

      const suppliersData = {
        bontour: parsedData.bontour,
        hori: parsedData.hori,
        gett: parsedData.gett
      };

      const matches = matchAllSuppliers(suppliersData, parsedData.rides, parsedData.employeeMap);
      setMatchResults(matches);

      const deptData = calculateDepartmentBreakdown(parsedData.rides, parsedData.employeeMap);
      setDepartmentData(deptData);

    } catch (err) {
      setError(`שגיאה בניתוח: ${err.message}`);
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [parsedData]);

  const handleUpdateDepartmentData = useCallback((employeeDepartmentAssignments) => {
    if (!employeeDepartmentAssignments || employeeDepartmentAssignments.size === 0) {
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);

      // יצירת עותק של employeeMap לעדכון
      const updatedEmployeeMap = new Map(parsedData.employeeMap);
      
      // עדכון המחלקות של העובדים
      employeeDepartmentAssignments.forEach((department, key) => {
        if (!department) return;
        
        // key יכול להיות `${rideId}-${employeeId}` או `ride-${rideId}`
        if (key.startsWith('ride-')) {
          // זה שיוך של נסיעה כולה ללא PIDs - נצטרך למצוא את ה-PIDs מהנסיעה
          const rideId = parseInt(key.replace('ride-', ''));
          const ride = parsedData.rides.find(r => r.rideId === rideId);
          if (ride && ride.pids && ride.pids.length > 0) {
            // אם יש PIDs, נעדכן אותם
            ride.pids.forEach(pid => {
              const employee = updatedEmployeeMap.get(pid);
              if (employee) {
                updatedEmployeeMap.set(pid, { ...employee, department });
              }
            });
          }
        } else {
          // זה שיוך של עובד ספציפי
          // המפתח הוא `${rideId}-${employeeId}`
          const parts = key.split('-');
          if (parts.length >= 2) {
            const rideId = parseInt(parts[0]);
            const employeeId = parseInt(parts[parts.length - 1]);
            
            const employee = updatedEmployeeMap.get(employeeId);
            if (employee) {
              updatedEmployeeMap.set(employeeId, { ...employee, department });
            } else {
              // אם העובד לא קיים, ניצור אותו עם המידע הבסיסי
              const ride = parsedData.rides.find(r => r.rideId === rideId);
              if (ride) {
                updatedEmployeeMap.set(employeeId, {
                  employeeId: employeeId,
                  firstName: `PID ${employeeId}`,
                  lastName: '',
                  department: department
                });
              }
            }
          }
        }
      });

      // עדכון parsedData עם employeeMap המעודכן
      setParsedData(prev => ({
        ...prev,
        employeeMap: updatedEmployeeMap
      }));

      // חישוב מחדש של ההתפלגות המחלקתית
      const deptData = calculateDepartmentBreakdown(parsedData.rides, updatedEmployeeMap);
      setDepartmentData(deptData);

    } catch (err) {
      setError(`שגיאה בעדכון נתונים: ${err.message}`);
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [parsedData]);

  const handleExportDepartments = useCallback(async () => {
    if (!departmentData) {
      alert('אין נתוני חלוקה מחלקתית לייצוא');
      return;
    }

    try {
      const { exportDepartmentReports } = await loadExcelExporter();
      await exportDepartmentReports(departmentData.breakdown);
    } catch (err) {
      setError(`שגיאה בייצוא: ${err.message}`);
      console.error(err);
    }
  }, [departmentData]);

  const handleExportAnalysis = useCallback(async () => {
    if (!matchResults) {
      alert('אין תוצאות ניתוח לייצוא');
      return;
    }

    try {
      const { exportAnalysisReport } = await loadExcelExporter();
      exportAnalysisReport(matchResults);
    } catch (err) {
      setError(`שגיאה בייצוא: ${err.message}`);
      console.error(err);
    }
  }, [matchResults]);

  return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <motion.header 
            className="mb-10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 via-purple-600 to-primary-600 bg-clip-text text-transparent mb-3">
                  דשבורד ניתוח נסיעות ספקים
                </h1>
                <p className="text-lg text-gray-600 font-medium">
                  מערכת לניתוח והשוואת קבצי ספקים עם רייד
                </p>
              </div>
            </div>
          </motion.header>

          <AnimatePresence>
            {error && (
              <motion.div 
                className="mb-6 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 text-red-800 px-6 py-4 rounded-xl shadow-soft"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-semibold">{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* כפתורי פעולה */}
          <motion.div 
            className="mb-8 flex gap-4 flex-wrap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.button
              onClick={loadDemoData}
              className="btn-modern bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl"
              disabled={isAnalyzing}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FileText className="w-4 h-4 inline-block ml-2" />
              טען נתוני דמו
            </motion.button>
            
            <motion.button
              onClick={clearData}
              className="btn-modern bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg hover:shadow-xl"
              disabled={isAnalyzing}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Trash2 className="w-4 h-4 inline-block ml-2" />
              נקה נתונים
            </motion.button>
            
            <motion.button
              onClick={runAnalysis}
              className="btn-modern bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isAnalyzing || parsedData.rides.length === 0}
              whileHover={{ scale: parsedData.rides.length > 0 ? 1.05 : 1 }}
              whileTap={{ scale: parsedData.rides.length > 0 ? 0.95 : 1 }}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 inline-block ml-2 animate-spin" />
                  מנתח...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 inline-block ml-2" />
                  נתח
                </>
              )}
            </motion.button>
            
            {matchResults && (
              <motion.button
                onClick={handleExportAnalysis}
                className="btn-modern bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg hover:shadow-xl"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Download className="w-4 h-4 inline-block ml-2" />
                ייצא דוח התאמות
              </motion.button>
            )}
            
            {departmentData && (
              <motion.button
                onClick={handleExportDepartments}
                className="btn-modern bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg hover:shadow-xl"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <BarChart3 className="w-4 h-4 inline-block ml-2" />
                ייצא דוחות Excel למחלקות
              </motion.button>
            )}
          </motion.div>

          {/* העלאת קבצים */}
          <motion.div 
            className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <FileUpload
              fileType="ride"
              label="קובץ רייד (CSV)"
              onFileUpload={handleFileUpload}
              currentFile={files.ride}
            />
            <FileUpload
              fileType="bontour"
              label="בון תור (Excel)"
              onFileUpload={handleFileUpload}
              currentFile={files.bontour}
            />
            <FileUpload
              fileType="hori"
              label="חורי (Excel)"
              onFileUpload={handleFileUpload}
              currentFile={files.hori}
            />
            <FileUpload
              fileType="gett"
              label="גט (Excel)"
              onFileUpload={handleFileUpload}
              currentFile={files.gett}
            />
            <FileUpload
              fileType="employees"
              label="מסד עובדים (CSV)"
              onFileUpload={handleFileUpload}
              currentFile={files.employees}
            />
          </motion.div>

          {/* סטטוס טעינה */}
          <AnimatePresence>
            {isAnalyzing && (
              <motion.div 
                className="mb-8 text-center py-12"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <motion.div
                  className="inline-block"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="w-12 h-12 text-primary-600" />
                </motion.div>
                <p className="mt-4 text-gray-700 font-semibold text-lg">מעבד נתונים...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* סיכום נתונים - קונטיינר מעוגל בצד שמאל */}
          {(matchResults || departmentData) && parsedData.rides.length > 0 && (
            <motion.div
              className="mb-8 flex justify-start"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl shadow-lg p-6 min-w-[300px]">
                <h3 className="text-lg font-bold text-gray-800 mb-4 text-right">סיכום נתונים</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">מספר נסיעות:</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {parsedData.rides.length.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">סכום כולל:</div>
                    <div className="text-2xl font-bold text-indigo-700">
                      ₪{parsedData.rides.reduce((sum, ride) => sum + (ride.price || 0), 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* נסיעות לבדיקה - נסיעות עם מחיר אפס */}
          {(matchResults || departmentData) && parsedData.rides.length > 0 && (
            <motion.div 
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Suspense fallback={
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
                  <p className="mt-2 text-gray-600">טוען נסיעות לבדיקה...</p>
                </div>
              }>
                <ZeroPriceRides rides={parsedData.rides} employeeMap={parsedData.employeeMap} />
              </Suspense>
            </motion.div>
          )}

          {/* תוצאות ניתוח */}
          {matchResults && (
            <motion.div 
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Suspense fallback={
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
                  <p className="mt-2 text-gray-600">טוען תוצאות...</p>
                </div>
              }>
                <AnalysisResults matchResults={matchResults} employeeMap={parsedData.employeeMap} />
              </Suspense>
            </motion.div>
          )}

          {/* חלוקה מחלקתית */}
          {departmentData && (
            <motion.div 
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Suspense fallback={
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
                  <p className="mt-2 text-gray-600">טוען חלוקה מחלקתית...</p>
                </div>
              }>
                <DepartmentBreakdown 
                  departmentData={departmentData} 
                  employeeMap={parsedData.employeeMap}
                  onUpdateDepartmentData={handleUpdateDepartmentData}
                />
              </Suspense>
            </motion.div>
          )}
      </div>
    </div>
  );
}

export default App;
