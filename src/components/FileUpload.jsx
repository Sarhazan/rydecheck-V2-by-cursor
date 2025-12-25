import { useState, useRef } from 'react';

export default function FileUpload({ fileType, label, onFileUpload, currentFile }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const dragCounter = useRef(0);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types && e.dataTransfer.types.indexOf('Files') !== -1) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types && e.dataTransfer.types.indexOf('Files') !== -1) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = (e) => {
    // רק אם הקליק לא היה על כפתור
    if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  const handleFile = (file) => {
    // בדיקת סוג קובץ
    const validExtensions = fileType === 'employees' || fileType === 'ride' 
      ? ['.csv'] 
      : ['.xlsx', '.xls'];
    
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      alert(`סוג קובץ לא תקף. אנא העלה קובץ ${validExtensions.join(' או ')}`);
      return;
    }

    onFileUpload(file, fileType);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : currentFile
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={fileType === 'employees' || fileType === 'ride' ? '.csv' : '.xlsx,.xls'}
          onChange={handleFileInput}
        />
        
        {currentFile ? (
          <div className="space-y-2">
            <div className="text-green-600 font-medium">✓ קובץ הועלה בהצלחה</div>
            <div className="text-sm text-gray-600">
              {currentFile.name}
            </div>
            <div className="text-xs text-gray-500">
              {formatFileSize(currentFile.size)}
            </div>
            <button
              className="text-xs text-red-600 hover:text-red-800 mt-2"
              onClick={(e) => {
                e.stopPropagation();
                onFileUpload(null, fileType);
              }}
            >
              הסר קובץ
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-gray-600">
              גרור קובץ לכאן או לחץ לבחירה
            </div>
            <div className="text-xs text-gray-500">
              {fileType === 'employees' || fileType === 'ride' 
                ? 'CSV בלבד' 
                : 'Excel (.xlsx, .xls)'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
