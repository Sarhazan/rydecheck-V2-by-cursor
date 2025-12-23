import { useState, useCallback, useEffect } from 'react';
import type { UploadResponse } from '../services/api';
import './GettUpload.css';

interface GettUploadProps {
  onFileUploaded: (filename: string) => void;
  clearTrigger: number;
  companyFilename: string | null;
}

interface GettColumnsData {
  success: boolean;
  headers: Record<string, string>;
  data: Array<Record<string, string>>;
  row_count: number;
}

interface RideGettColumnsData {
  success: boolean;
  headers: Record<string, string>;
  data: Array<Record<string, string>>;
  row_count: number;
}

export default function GettUpload({ onFileUploaded, clearTrigger, companyFilename }: GettUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileFullPath, setFileFullPath] = useState<string | null>(null);
  const [rows, setRows] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [tableData, setTableData] = useState<GettColumnsData | null>(null);
  const [rideTableData, setRideTableData] = useState<RideGettColumnsData | null>(null);
  // Reset local state when clearTrigger changes
  useEffect(() => {
    setDragging(false);
    setUploading(false);
    setFileName(null);
    setRows(null);
    setError(null);
    setLoadingColumns(false);
    setTableData(null);
    setFileFullPath(null);
    setRideTableData(null);
  }, [clearTrigger]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFile(files[0]);
    }
  }, []);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFile(files[0]);
    }
  }, []);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    setRows(null);
    setMatchResults(null);

    try {
      const { api } = await import('../services/api');
      const response: UploadResponse = await api.uploadFile(file, 'supplier2');
      
      if (response.success) {
        const displayName = response.filename.split('/').pop() || response.filename;
        setFileName(displayName);
        setFileFullPath(response.filename);
        setRows(response.rows || null);
        onFileUploaded(response.filename);
        await loadColumnsData(response.filename);
        if (companyFilename) {
          await loadRideColumns(companyFilename);
        }
      } else {
        setError(response.error || 'שגיאה בהעלאת הקובץ');
      }
    } catch (err: any) {
      setError(err.message || 'שגיאה בהעלאת הקובץ');
    } finally {
      setUploading(false);
    }
  };

  const loadColumnsData = async (filename: string) => {
    setLoadingColumns(true);
    setError(null);
    try {
      const API_BASE_URL = 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/gett-columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'שגיאה בטעינת העמודות');
      }

      const data: GettColumnsData = await response.json();
      setTableData(data);
    } catch (err: any) {
      setError(err.message || 'שגיאה בטעינת העמודות');
      setTableData(null);
    } finally {
      setLoadingColumns(false);
    }
  };

  const loadRideColumns = async (companyFile: string) => {
    try {
      const { api } = await import('../services/api');
      const data: RideGettColumnsData = await api.rideGettColumns(companyFile);
      setRideTableData(data);
    } catch (err: any) {
      setError(err.message || 'שגיאה בטעינת עמודות רייד');
      setRideTableData(null);
    }
  };

  return (
    <div className="gett-upload-container">
      <div
        className={`gett-upload-card ${dragging ? 'dragging' : ''} ${fileName ? 'uploaded' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="gett-card-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="gett-card-title">קובץ גט</h3>
        <p className="gett-card-description">
          העלה את קובץ גט לבדיקה וניתוח
        </p>
        
        {uploading ? (
          <div className="gett-card-status">
            <span className="spinner">⏳</span>
            מעלה קובץ...
          </div>
        ) : fileName ? (
          <>
            <div className="gett-card-status success">
              <span>✓</span>
              <div className="gett-file-info">
                <div className="gett-file-name">{fileName}</div>
                {rows !== null && (
                  <div className="gett-file-rows">מספר פריטים: {rows.toLocaleString('he-IL')}</div>
                )}
              </div>
            </div>

            {loadingColumns ? (
              <div className="gett-card-status" style={{ marginTop: '1rem' }}>
                <span className="spinner">⏳</span>
                טוען עמודות...
              </div>
            ) : tableData && (
              <div className="gett-table-container" style={{ marginTop: '1rem', width: '100%', overflowX: 'auto' }}>
                <div style={{ textAlign: 'right', marginBottom: '0.5rem', direction: 'rtl' }}>
                  מספר פריטים נטענו: {tableData.row_count.toLocaleString('he-IL')}
                </div>
                <table className="gett-data-table" style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl' }}>
                  <thead>
                    <tr>
                      <th>{tableData.headers['col_1'] || 'B'}</th>
                      <th>{tableData.headers['col_3'] || 'D'}</th>
                      <th>{tableData.headers['col_6'] || 'G'}</th>
                      <th>{tableData.headers['col_7'] || 'H'}</th>
                      <th>{tableData.headers['col_10'] || 'K'}</th>
                      <th>{tableData.headers['col_11'] || 'L'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.data.map((row, idx) => (
                      <tr key={idx}>
                        <td>{row['col_1'] || ''}</td>
                        <td>{row['col_3'] || ''}</td>
                        <td>{row['col_6'] || ''}</td>
                        <td>{row['col_7'] || ''}</td>
                        <td>{row['col_10'] || ''}</td>
                        <td>{row['col_11'] || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {companyFilename && fileName && (
              <button
                className="gett-match-button"
                style={{ marginTop: '1rem' }}
                onClick={handleMatchTrips}
                disabled={matching}
              >
                {matching ? 'מתאים נסיעות...' : 'MATCH TRIPS'}
              </button>
            )}
            {companyFilename && fileName && (
              <button
                className="gett-match-button"
                style={{ marginTop: '0.5rem', backgroundColor: '#ffd54f' }}
                onClick={startManualReview}
                disabled={manualLoading}
              >
                {manualLoading ? 'טוען התאמה ידנית...' : 'בדוק התאמה ידנית (נסיעה יחידה)'}
              </button>
            )}

            {matchResults && (
              <div style={{ marginTop: '1.5rem', width: '100%' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', direction: 'rtl', justifyContent: 'flex-start' }}>
                  <button
                    className="tab-btn"
                    onClick={handleReviewMatches}
                    disabled={proposalLoading}
                  >
                    {proposalLoading ? 'טוען הצעות...' : 'עבור לאישור ידני'}
                  </button>
                </div>
                <div className="tab-buttons" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', direction: 'rtl' }}>
                  <button
                    className={`tab-btn ${activeTab === 'matched' ? 'active' : ''}`}
                    onClick={() => setActiveTab('matched')}
                  >
                    נסיעות שהותאמו ({matchedRows.length})
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'unmatched' ? 'active' : ''}`}
                    onClick={() => setActiveTab('unmatched')}
                  >
                    לא הותאמו (גט:{unmatchedGett.length} | רייד:{unmatchedCompany.length})
                  </button>
                </div>

                {activeTab === 'matched' && (
                  <div className="gett-table-container" style={{ width: '100%', overflowX: 'auto' }}>
                    <table className="gett-data-table" style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl' }}>
                      <thead>
                        <tr>
                          <th>מספר נסיעה (ספק)</th>
                          <th>מספר נסיעה (חברה)</th>
                          <th>תאריך/שעה (ספק)</th>
                          <th>תאריך/שעה (חברה)</th>
                          <th>מקור</th>
                          <th>יעד</th>
                          <th>נוסעים</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchedRows.map((m: any, idx: number) => (
                          <tr key={idx}>
                            <td>{m?.supplier_trip?.trip_id || ''}</td>
                            <td>{m?.company_trip?.trip_id || ''}</td>
                            <td>{m?.supplier_trip?.date || ''} {m?.supplier_trip?.time || ''}</td>
                            <td>{m?.company_trip?.date || ''} {m?.company_trip?.time || ''}</td>
                            <td>{m?.supplier_trip?.source || ''}</td>
                            <td>{m?.supplier_trip?.destination || ''}</td>
                            <td>{m?.supplier_trip?.passengers || ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'unmatched' && (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div className="gett-table-container" style={{ width: '100%', overflowX: 'auto' }}>
                      <div style={{ textAlign: 'right', marginBottom: '0.5rem', direction: 'rtl' }}>לא נמצאו ברייד (גט): {unmatchedGett.length}</div>
                      <table className="gett-data-table" style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl' }}>
                        <thead>
                          <tr>
                            <th>מספר נסיעה (ספק)</th>
                            <th>תאריך/שעה</th>
                            <th>מקור</th>
                            <th>יעד</th>
                            <th>נוסעים</th>
                            <th>מחיר ספק</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unmatchedGett.map((g: any, idx: number) => (
                            <tr key={idx}>
                              <td>{g?.trip_id || ''}</td>
                              <td>{g?.date || ''} {g?.time || ''}</td>
                              <td>{g?.source || ''}</td>
                              <td>{g?.destination || ''}</td>
                              <td>{g?.passengers || ''}</td>
                              <td>{g?.price || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="gett-table-container" style={{ width: '100%', overflowX: 'auto' }}>
                      <div style={{ textAlign: 'right', marginBottom: '0.5rem', direction: 'rtl' }}>לא נמצאו בגט (רייד): {unmatchedCompany.length}</div>
                      <table className="gett-data-table" style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl' }}>
                        <thead>
                          <tr>
                            <th>מספר נסיעה (חברה)</th>
                            <th>תאריך/שעה</th>
                            <th>מקור</th>
                            <th>יעד</th>
                            <th>נוסעים</th>
                            <th>מחיר חברה</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unmatchedCompany.map((c: any, idx: number) => (
                            <tr key={idx}>
                              <td>{c?.trip_id || ''}</td>
                              <td>{c?.date || ''} {c?.time || ''}</td>
                              <td>{c?.source || ''}</td>
                              <td>{c?.destination || ''}</td>
                              <td>{c?.passengers || ''}</td>
                              <td>{c?.price || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
            
          </>
        ) : (
          <>
            <div className="gett-card-hint">
              גרור קובץ לכאן או לחץ לבחירה
            </div>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileInput}
              className="gett-card-file-input"
            />
          </>
        )}
        
        {error && (
          <div className="gett-card-error">{error}</div>
        )}
      </div>
      {manualModalOpen && (
        <div className="gett-modal-backdrop">
          <div className="gett-modal">
            <div className="gett-modal-header">
              <h3>אישור ידני להתאמה (גט)</h3>
              <button onClick={() => setManualModalOpen(false)}>✕</button>
            </div>
            <div className="gett-modal-body">
              <div style={{ direction: 'rtl', marginBottom: '0.75rem' }}>
                נסיעה: {manualPair ? manualPair.index + 1 : 0} מתוך {manualPair?.total_gett ?? 0} | נותרו: {manualPair?.remaining ?? 0}
              </div>
              {manualPair ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', direction: 'rtl' }}>
                  <div className="gett-table-container" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    <div style={{ marginBottom: '0.5rem' }}><strong>גט</strong></div>
                    <table className="gett-data-table" style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl' }}>
                      <tbody>
                        <tr><th>מס' נסיעה</th><td>{manualPair.gett_trip?.trip_id || ''}</td></tr>
                        <tr><th>תאריך</th><td>{manualPair.gett_trip?.date || ''}</td></tr>
                        <tr><th>שעה</th><td>{manualPair.gett_trip?.time || ''}</td></tr>
                        <tr><th>מקור</th><td>{manualPair.gett_trip?.source || ''}</td></tr>
                        <tr><th>יעד</th><td>{manualPair.gett_trip?.destination || ''}</td></tr>
                        <tr><th>נוסעים</th><td>{manualPair.gett_trip?.passengers || ''}</td></tr>
                        <tr><th>מחיר ספק</th><td>{manualPair.gett_trip?.price || ''}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="gett-table-container" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    <div style={{ marginBottom: '0.5rem' }}><strong>רייד</strong></div>
                    <table className="gett-data-table" style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl' }}>
                      <tbody>
                        <tr><th>מס' נסיעה</th><td>{manualPair.company_trip?.trip_id || ''}</td></tr>
                        <tr><th>תאריך</th><td>{manualPair.company_trip?.date || ''}</td></tr>
                        <tr><th>שעה</th><td>{manualPair.company_trip?.time || ''}</td></tr>
                        <tr><th>מקור</th><td>{manualPair.company_trip?.source || ''}</td></tr>
                        <tr><th>יעד</th><td>{manualPair.company_trip?.destination || ''}</td></tr>
                        <tr><th>נוסעים</th><td>{manualPair.company_trip?.passengers || ''}</td></tr>
                        <tr><th>מחיר חברה</th><td>{manualPair.company_trip?.price || ''}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div style={{ direction: 'rtl' }}>אין עוד נסיעות לסקירה.</div>
              )}
            </div>
            <div className="gett-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="tab-btn" onClick={() => setManualModalOpen(false)}>סגור</button>
              <button className="tab-btn" onClick={() => handleManualDecision('skip')} disabled={manualLoading || !manualPair}>דלג</button>
              <button className="tab-btn" onClick={() => handleManualDecision('approve')} disabled={manualLoading || !manualPair}>אשר</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

