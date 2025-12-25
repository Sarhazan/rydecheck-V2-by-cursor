import { useState, useCallback } from 'react';
import './FileUpload.css';

interface FileUploadProps {
  label: string;
  type: 'company' | 'supplier1' | 'supplier2' | 'supplier3' | 'employee';
  onFileUploaded: (filename: string) => void;
  acceptedTypes?: string[];
}

export default function FileUpload({ 
  label, 
  type, 
  onFileUploaded,
  acceptedTypes = ['.csv', '.xlsx', '.xls']
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
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
    setIsDragging(false);

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

    // Validate file type
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExt)) {
      setError(`סוג קובץ לא נתמך. נא להעלות ${acceptedTypes.join(', ')}`);
      setUploading(false);
      return;
    }

    try {
      const { api } = await import('../services/api');
      const response = await api.uploadFile(file, type);
      
      if (response.success) {
        setUploadedFile(response.filename);
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
    <div className="file-upload-container">
      <label className="file-upload-label">{label}</label>
      <div
        className={`file-upload-area ${isDragging ? 'dragging' : ''} ${uploadedFile ? 'uploaded' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="upload-status">מעלה קובץ...</div>
        ) : uploadedFile ? (
          <div className="upload-status success">
            <span>✓</span> {uploadedFile}
          </div>
        ) : (
          <>
            <div className="upload-icon">📁</div>
            <div className="upload-text">
              גרור קובץ לכאן או לחץ לבחירה
            </div>
            <div className="upload-hint">
              {acceptedTypes.join(', ')}
            </div>
            <input
              type="file"
              accept={acceptedTypes.join(',')}
              onChange={handleFileInput}
              className="file-input"
            />
          </>
        )}
        {error && <div className="upload-error">{error}</div>}
      </div>
    </div>
  );
}

