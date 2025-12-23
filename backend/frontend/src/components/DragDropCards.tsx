import { useState, useCallback, useEffect } from 'react';
import './DragDropCards.css';

interface DragDropCardsProps {
  onRideFileUploaded: (filename: string) => void;
  onBonTourFileUploaded: (filename: string) => void;
  clearTrigger: number;
}

export default function DragDropCards({
  onRideFileUploaded,
  onBonTourFileUploaded,
  clearTrigger
}: DragDropCardsProps) {
  const [rideDragging, setRideDragging] = useState(false);
  const [bonTourDragging, setBonTourDragging] = useState(false);
  const [rideUploading, setRideUploading] = useState(false);
  const [bonTourUploading, setBonTourUploading] = useState(false);
  const [rideFile, setRideFile] = useState<string | null>(null);
  const [bonTourFile, setBonTourFile] = useState<string | null>(null);
  const [rideRows, setRideRows] = useState<number | null>(null);
  const [bonTourRows, setBonTourRows] = useState<number | null>(null);
  const [rideError, setRideError] = useState<string | null>(null);
  const [bonTourError, setBonTourError] = useState<string | null>(null);

  // Reset local state when clearTrigger changes
  useEffect(() => {
    setRideDragging(false);
    setBonTourDragging(false);
    setRideUploading(false);
    setBonTourUploading(false);
    setRideFile(null);
    setBonTourFile(null);
    setRideRows(null);
    setBonTourRows(null);
    setRideError(null);
    setBonTourError(null);
  }, [clearTrigger]);

  const handleRideDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setRideDragging(true);
    }
  }, []);

  const handleRideDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setRideDragging(false);
    }
  }, []);

  const handleRideDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleRideDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRideDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleRideFile(files[0]);
    }
  }, []);

  const handleBonTourDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setBonTourDragging(true);
    }
  }, []);

  const handleBonTourDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setBonTourDragging(false);
    }
  }, []);

  const handleBonTourDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleBonTourDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBonTourDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleBonTourFile(files[0]);
    }
  }, []);

  const handleRideFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleRideFile(files[0]);
    }
  }, []);

  const handleBonTourFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleBonTourFile(files[0]);
    }
  }, []);

  const handleRideFile = async (file: File) => {
    setRideError(null);
    setRideUploading(true);

    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    const acceptedTypes = ['.csv', '.xlsx', '.xls'];
    
    if (!acceptedTypes.includes(fileExt)) {
      setRideError(`סוג קובץ לא נתמך. נא להעלות ${acceptedTypes.join(', ')}`);
      setRideUploading(false);
      return;
    }

    try {
      const { api } = await import('../services/api');
      const response = await api.uploadFile(file, 'company');
      
      if (response.success) {
        setRideFile(response.filename);
        setRideRows(response.rows || null);
        onRideFileUploaded(response.filename);
      } else {
        setRideError(response.error || 'שגיאה בהעלאת הקובץ');
      }
    } catch (err: any) {
      setRideError(err.message || 'שגיאה בהעלאת הקובץ');
    } finally {
      setRideUploading(false);
    }
  };

  const handleBonTourFile = async (file: File) => {
    setBonTourError(null);
    setBonTourUploading(true);

    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    const acceptedTypes = ['.csv', '.xlsx', '.xls'];
    
    if (!acceptedTypes.includes(fileExt)) {
      setBonTourError(`סוג קובץ לא נתמך. נא להעלות ${acceptedTypes.join(', ')}`);
      setBonTourUploading(false);
      return;
    }

    try {
      const { api } = await import('../services/api');
      const response = await api.uploadFile(file, 'supplier1');
      
      if (response.success) {
        setBonTourFile(response.filename);
        setBonTourRows(response.rows || null);
        onBonTourFileUploaded(response.filename);
      } else {
        setBonTourError(response.error || 'שגיאה בהעלאת הקובץ');
      }
    } catch (err: any) {
      setBonTourError(err.message || 'שגיאה בהעלאת הקובץ');
    } finally {
      setBonTourUploading(false);
    }
  };

  return (
    <div className="drag-drop-cards-container">
      <div
        className={`drag-drop-card ${rideDragging ? 'dragging' : ''} ${rideFile ? 'uploaded' : ''}`}
        onDragEnter={handleRideDragEnter}
        onDragLeave={handleRideDragLeave}
        onDragOver={handleRideDragOver}
        onDrop={handleRideDrop}
      >
        <div className="card-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="card-title">קובץ רייד (Ride)</h3>
        <p className="card-description">
          העלה את דוח הנסיעות לניתוח מגמות וביצועים
        </p>
        
        {rideUploading ? (
          <div className="card-status">
            <span className="spinner">⏳</span>
            מעלה קובץ...
          </div>
        ) : rideFile ? (
          <div className="card-status success">
            <span>✓</span>
            <div className="file-info">
              <div className="file-name">{rideFile}</div>
              {rideRows !== null && (
                <div className="file-rows">מספר פריטים: {rideRows.toLocaleString('he-IL')}</div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="card-hint">
              גרור קובץ לכאן או לחץ לבחירה
            </div>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleRideFileInput}
              className="card-file-input"
            />
          </>
        )}
        
        {rideError && (
          <div className="card-error">{rideError}</div>
        )}
      </div>

      <div
        className={`drag-drop-card ${bonTourDragging ? 'dragging' : ''} ${bonTourFile ? 'uploaded' : ''}`}
        onDragEnter={handleBonTourDragEnter}
        onDragLeave={handleBonTourDragLeave}
        onDragOver={handleBonTourDragOver}
        onDrop={handleBonTourDrop}
      >
        <div className="card-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="card-title">קובץ Bon Tour</h3>
        <p className="card-description">
          העלה את קובץ הבון-טור להתאמה וסנכרון
        </p>
        
        {bonTourUploading ? (
          <div className="card-status">
            <span className="spinner">⏳</span>
            מעלה קובץ...
          </div>
        ) : bonTourFile ? (
          <div className="card-status success">
            <span>✓</span>
            <div className="file-info">
              <div className="file-name">{bonTourFile}</div>
              {bonTourRows !== null && (
                <div className="file-rows">מספר פריטים: {bonTourRows.toLocaleString('he-IL')}</div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="card-hint">
              גרור קובץ לכאן או לחץ לבחירה
            </div>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleBonTourFileInput}
              className="card-file-input"
            />
          </>
        )}
        
        {bonTourError && (
          <div className="card-error">{bonTourError}</div>
        )}
      </div>
    </div>
  );
}

