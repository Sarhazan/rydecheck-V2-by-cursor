// React
import { useState, useRef, useCallback, memo } from 'react';

// Framer Motion
import { motion, AnimatePresence } from 'framer-motion';

// Icons
import { Upload, CheckCircle2, X } from 'lucide-react';

const FileUpload = memo(function FileUpload({ fileType, label, onFileUpload, currentFile }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types && e.dataTransfer.types.indexOf('Files') !== -1) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types && e.dataTransfer.types.indexOf('Files') !== -1) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleFile = useCallback((file) => {
    const validExtensions = fileType === 'employees' || fileType === 'ride' 
      ? ['.csv'] 
      : ['.xlsx', '.xls'];
    
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      alert(`סוג קובץ לא תקף. אנא העלה קובץ ${validExtensions.join(' או ')}`);
      return;
    }

    onFileUpload(file, fileType);
  }, [fileType, onFileUpload]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleClick = useCallback((e) => {
    if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  }, []);

  const handleRemove = useCallback((e) => {
    e.stopPropagation();
    onFileUpload(null, fileType);
  }, [fileType, onFileUpload]);

  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }, []);

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div
        className={`group relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 ${
          isDragging
            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 scale-[1.02] shadow-lg'
            : currentFile
            ? 'border-green-500 bg-gradient-to-br from-green-50 to-green-100'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
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
        
        <AnimatePresence mode="wait">
          {currentFile ? (
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </motion.div>
              </div>
            <div className="text-green-700 font-semibold">קובץ הועלה בהצלחה</div>
            <div className="text-sm text-gray-700 font-medium">
              {currentFile.name}
            </div>
            <div className="text-xs text-gray-500">
              {formatFileSize(currentFile.size)}
            </div>
              <button
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 mt-2 transition-colors"
                onClick={handleRemove}
              >
                <X className="w-4 h-4" />
                הסר קובץ
              </button>
            </motion.div>
          ) : (
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
            <div className="flex items-center justify-center">
              <Upload className={`w-10 h-10 text-gray-400 transition-all duration-300 ${isDragging ? 'scale-110 text-blue-500' : 'group-hover:text-gray-600'}`} />
            </div>
            <div className="text-gray-700 font-medium">
              גרור קובץ לכאן או לחץ לבחירה
            </div>
              <div className="text-xs text-gray-500">
                {fileType === 'employees' || fileType === 'ride' 
                  ? 'CSV בלבד' 
                  : 'Excel (.xlsx, .xls)'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default FileUpload;
