"""Logging middleware for the application"""
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional
from config import get_workspace_root


class Logger:
    """Simple logger for debug information"""
    
    def __init__(self, enabled: bool = False):
        """
        Initialize logger.
        
        Args:
            enabled: Whether logging is enabled (default: False for production)
        """
        self.enabled = enabled
        self.log_path = None
        
        if self.enabled:
            try:
                workspace_root = get_workspace_root()
                self.log_path = workspace_root / '.cursor' / 'debug.log'
                self.log_path.parent.mkdir(parents=True, exist_ok=True)
            except Exception:
                self.enabled = False
    
    def log(self, 
            location: str, 
            message: str, 
            data: Optional[Dict[str, Any]] = None,
            session_id: str = 'default',
            run_id: str = 'default',
            hypothesis_id: Optional[str] = None) -> None:
        """
        Log a debug entry.
        
        Args:
            location: Code location (e.g., 'app.py:48')
            message: Log message
            data: Optional data dictionary
            session_id: Session identifier
            run_id: Run identifier
            hypothesis_id: Optional hypothesis identifier
        """
        if not self.enabled or not self.log_path:
            return
        
        try:
            log_entry = {
                'timestamp': str(datetime.now()),
                'location': location,
                'message': message,
                'data': data or {},
                'sessionId': session_id,
                'runId': run_id,
            }
            
            if hypothesis_id:
                log_entry['hypothesisId'] = hypothesis_id
            
            with open(self.log_path, 'a', encoding='utf-8') as f:
                f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
                f.flush()
        except Exception:
            # Silently fail if logging fails
            pass


# Global logger instance (disabled by default)
logger = Logger(enabled=False)

