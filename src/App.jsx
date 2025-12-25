import { useState } from 'react';
import FileUpload from './components/FileUpload';
import AnalysisResults from './components/AnalysisResults';
import DepartmentBreakdown from './components/DepartmentBreakdown';
import { parseFile } from './utils/fileParser';
import { matchAllSuppliers } from './utils/rideMatcher';
import { calculateDepartmentBreakdown } from './utils/departmentCalculator';
import { exportDepartmentReports, exportAnalysisReport } from './utils/excelExporter';

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

  const handleFileUpload = async (file, fileType) => {
    if (!file) {
      // הסרת קובץ
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
  };

  const loadDemoData = async () => {
    try {
      setError(null);
      setIsAnalyzing(true);

      // טעינת קבצי דמו מהתיקייה public/demo
      const demoFiles = {
        ride: 'קובץ רייד 1125.csv',
        bontour: 'בון תור 1125.xlsx',
        hori: 'חורי 1125.xlsx',
        gett: 'דוח גט 1125.xlsx',
        employees: 'מסד עובדים.csv'
      };

      // נסה לטעון את הקבצים מהתיקייה הנוכחית (public)
      // בפועל, נצטרך להעתיק אותם ל-public/demo
      // לעת עתה, נשתמש בקבצים הקיימים בתיקייה
      
      alert('אנא העלה את הקבצים ידנית. תכונת דמו תצריך העתקת קבצים ל-public/demo');
      
    } catch (err) {
      setError(`שגיאה בטעינת נתוני דמו: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearData = () => {
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
  };

  const runAnalysis = async () => {
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

      // 1. התאמת ספקים
      const suppliersData = {
        bontour: parsedData.bontour,
        hori: parsedData.hori,
        gett: parsedData.gett
      };

      const matches = matchAllSuppliers(suppliersData, parsedData.rides, parsedData.employeeMap);
      
      setMatchResults(matches);

      // 2. חלוקה מחלקתית
      const deptData = calculateDepartmentBreakdown(parsedData.rides, parsedData.employeeMap);
      setDepartmentData(deptData);

    } catch (err) {
      setError(`שגיאה בניתוח: ${err.message}`);
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportDepartments = async () => {
    if (!departmentData) {
      alert('אין נתוני חלוקה מחלקתית לייצוא');
      return;
    }

    try {
      await exportDepartmentReports(departmentData.breakdown);
    } catch (err) {
      setError(`שגיאה בייצוא: ${err.message}`);
      console.error(err);
    }
  };

  const handleExportAnalysis = () => {
    if (!matchResults) {
      alert('אין תוצאות ניתוח לייצוא');
      return;
    }

    try {
      exportAnalysisReport(matchResults);
    } catch (err) {
      setError(`שגיאה בייצוא: ${err.message}`);
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                דשבורד ניתוח נסיעות ספקים
              </h1>
              <p className="text-gray-600">
                מערכת לניתוח והשוואת קבצי ספקים עם רייד
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* כפתורי פעולה */}
        <div className="mb-8 flex gap-4 flex-wrap">
          <button
            onClick={loadDemoData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={isAnalyzing}
          >
            טען נתוני דמו
          </button>
          <button
            onClick={clearData}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            disabled={isAnalyzing}
          >
            נקה נתונים
          </button>
          <button
            onClick={runAnalysis}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            disabled={isAnalyzing || parsedData.rides.length === 0}
          >
            {isAnalyzing ? 'מנתח...' : 'נתח'}
          </button>
          {matchResults && (
            <button
              onClick={handleExportAnalysis}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              ייצא דוח התאמות
            </button>
          )}
          {departmentData && (
            <button
              onClick={handleExportDepartments}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              ייצא דוחות Excel למחלקות
            </button>
          )}
        </div>

        {/* העלאת קבצים */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        </div>

        {/* סטטוס טעינה */}
        {isAnalyzing && (
          <div className="mb-8 text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">מעבד נתונים...</p>
          </div>
        )}

        {/* תוצאות ניתוח */}
        {matchResults && (
          <div className="mb-8">
            <AnalysisResults matchResults={matchResults} employeeMap={parsedData.employeeMap} />
          </div>
        )}

        {/* חלוקה מחלקתית */}
        {departmentData && (
          <div className="mb-8">
            <DepartmentBreakdown departmentData={departmentData} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
