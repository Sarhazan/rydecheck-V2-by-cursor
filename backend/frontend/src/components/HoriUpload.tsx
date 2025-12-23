import { useState, useCallback, useEffect } from 'react';
import type { UploadResponse } from '../services/api';
import './HoriUpload.css';

interface HoriUploadProps {
  onFileUploaded: (filename: string) => void;
  clearTrigger: number;
}

export default function HoriUpload({ onFileUploaded, clearTrigger }: HoriUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset local state when clearTrigger changes
  useEffect(() => {
    setDragging(false);
    setUploading(false);
    setFileName(null);
    setRows(null);
    setError(null);
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

    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    const acceptedTypes = ['.csv', '.xlsx', '.xls'];
    
    if (!acceptedTypes.includes(fileExt)) {
      setError(`סוג קובץ לא נתמך. נא להעלות ${acceptedTypes.join(', ')}`);
      setUploading(false);
      return;
    }

    try {
      const { api } = await import('../services/api');
      const response: UploadResponse = await api.uploadFile(file, 'supplier3');
      
      if (response.success) {
        const displayName = response.filename.split('/').pop() || response.filename;
        setFileName(displayName);
        setRows(response.rows || null);
        onFileUploaded(response.filename);
      } else {
        setError(response.error || 'שגיאה בהעלאת הקובץ');
      }
    } catch (err: any) {
      setError(err.message || 'שגיאה בהעלאת הקובץ');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="hori-upload-container">
      <div
        className={`hori-upload-card ${dragging ? 'dragging' : ''} ${fileName ? 'uploaded' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="hori-card-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="hori-card-title">קובץ מוניות חורי</h3>
        <p className="hori-card-description">
          העלה את קובץ מוניות חורי לבדיקה וניתוח
        </p>
        
        {uploading ? (
          <div className="hori-card-status">
            <span className="spinner">⏳</span>
            מעלה קובץ...
          </div>
        ) : fileName ? (
          <div className="hori-card-status success">
            <span>✓</span>
            <div className="hori-file-info">
              <div className="hori-file-name">{fileName}</div>
              {rows !== null && (
                <div className="hori-file-rows">מספר פריטים: {rows.toLocaleString('he-IL')}</div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="hori-card-hint">
              גרור קובץ לכאן או לחץ לבחירה
            </div>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileInput}
              className="hori-card-file-input"
            />
          </>
        )}
        
        {error && (
          <div className="hori-card-error">{error}</div>
        )}
      </div>
    </div>
  );
}

