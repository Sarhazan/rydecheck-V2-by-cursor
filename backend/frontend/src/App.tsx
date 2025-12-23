import { useState, useEffect } from 'react';
import DragDropCards from './components/DragDropCards';
import ComparisonTable from './components/ComparisonTable';
import DepartmentReports from './components/DepartmentReports';
import HoriUpload from './components/HoriUpload';
import { api } from './services/api';
import type { ComparisonResult } from './services/api';
import './App.css';

function App() {
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});
  const [comparing, setComparing] = useState(false);
  const [results, setResults] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backendConnected, setBackendConnected] = useState(false);
  const [horiResults, setHoriResults] = useState<ComparisonResult | null>(null);
  const [horiFilename, setHoriFilename] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [clearTrigger, setClearTrigger] = useState(0);

  useEffect(() => {
    // Check backend connection
    api.healthCheck()
      .then(() => setBackendConnected(true))
      .catch(() => setBackendConnected(false));
  }, []);

  const handleRideFileUploaded = (filename: string) => {
    setUploadedFiles(prev => ({
      ...prev,
      company: filename
    }));
    setError(null);
    setSuccessMessage(null);
  };

  const handleBonTourFileUploaded = (filename: string) => {
    setUploadedFiles(prev => ({
      ...prev,
      supplier1: filename
    }));
    setError(null);
    setSuccessMessage(null);
  };

  const handleHoriFileUploaded = (filename: string) => {
    setHoriFilename(filename);
    setSuccessMessage(null);
  };

  const handleCompare = async () => {
    if (!uploadedFiles.company || !uploadedFiles.supplier1 || !horiFilename) {
      setError('נא להעלות את כל שלושת הקבצים');
      return;
    }

    setComparing(true);
    setError(null);

    try {
      // Compare Bon Tour
      console.log('Comparing Bon Tour...');
      const bonTourResults = await api.compareFiles({
        company: uploadedFiles.company,
        supplier1: uploadedFiles.supplier1
      });
      console.log('Bon Tour comparison results received:', bonTourResults);
      setResults(bonTourResults);

      // Compare Hori
      console.log('Comparing Hori...');
      const horiComparisonResults = await api.compareFiles({
        company: uploadedFiles.company,
        supplier3: horiFilename
      });
      console.log('Hori comparison results received:', horiComparisonResults);
      setHoriResults(horiComparisonResults);
    } catch (err: any) {
      console.error('Comparison error:', err);
      setError(err.message || 'שגיאה בביצוע ההשוואה');
    } finally {
      setComparing(false);
    }
  };

  const handleClearData = async () => {
    try {
      setError(null);
      setSuccessMessage(null);
      await api.clearDemoData();
      setUploadedFiles({});
      setResults(null);
      setHoriResults(null);
      setHoriFilename(null);
      setClearTrigger(prev => prev + 1);
      setSuccessMessage('הנתונים נוקו בהצלחה');
    } catch (err: any) {
      setError(err.message || 'שגיאה בניקוי הנתונים');
    }
  };

  const handleLoadDemo = async () => {
    try {
      setError(null);
      setSuccessMessage(null);
      const resp = await api.loadDemoData();
      if (resp.success && resp.files) {
        setUploadedFiles({
          company: resp.files.company,
          supplier1: resp.files.supplier1
        });
        setHoriFilename(resp.files.supplier3 || null);
        setSuccessMessage(resp.message || 'הדאטה נטען בהצלחה');
      }
    } catch (err: any) {
      setError(err.message || 'שגיאה בטעינת הדאטה');
    }
  };

  const allFilesReady = uploadedFiles.company && uploadedFiles.supplier1 && horiFilename;

  return (
    <div className="app">
      <header className="app-header">
        <h1>RideAnalytics CORPORATE PLATFORM v2.5</h1>
        <div className={`backend-status ${backendConnected ? 'connected' : 'disconnected'}`}>
          {backendConnected ? '✓ מחובר לשרת' : '✗ לא מחובר לשרת'}
        </div>
        <div className="header-actions">
          <button className="header-btn" onClick={handleClearData}>
            נקה נתונים
          </button>
          <button className="header-btn primary" onClick={handleLoadDemo}>
            טען נתונים
          </button>
        </div>
      </header>

      <main className="app-main">
        <section className="upload-section">
          <DragDropCards
            onRideFileUploaded={handleRideFileUploaded}
            onBonTourFileUploaded={handleBonTourFileUploaded}
            clearTrigger={clearTrigger}
          />

          <HoriUpload
            onFileUploaded={handleHoriFileUploaded}
            clearTrigger={clearTrigger}
          />

          {allFilesReady && (
            <div className="compare-section">
              <button
                className={`analyze-button ${allFilesReady ? 'enabled' : 'disabled'}`}
                onClick={handleCompare}
                disabled={comparing || !allFilesReady}
              >
                {comparing ? (
                  <>
                    <span className="spinner">⏳</span>
                    מנתח את הנתונים...
                  </>
                ) : (
                  <>
                    <span className="analyze-icon">📊</span>
                    נתח את הנתונים
                  </>
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="success-message">
              {successMessage}
            </div>
          )}
        </section>

        {results && (
          <>
            <section className="results-section">
              <ComparisonTable results={results} />
            </section>

            {results.department_allocations && (
              <section className="department-section">
                <DepartmentReports departmentAllocations={results.department_allocations} />
              </section>
            )}
          </>
        )}

        {horiResults && (
          <section className="results-section">
            <h2 style={{ textAlign: 'center', marginBottom: '1rem', direction: 'rtl' }}>תוצאות השוואת מוניות חורי</h2>
            <ComparisonTable results={horiResults} />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
