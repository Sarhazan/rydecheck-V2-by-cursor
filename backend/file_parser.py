import pandas as pd
import os
from typing import List, Dict, Any
from config import GETT_HEADER_ROW, GETT_COLUMN_INDICES

class FileParser:
    """Parser for CSV and Excel files"""
    
    def __init__(self):
        self.upload_folder = 'uploads'
    
    def parse_file(self, filepath: str, file_type: str) -> List[Dict[str, Any]]:
        """
        Parse a file based on its type
        
        Args:
            filepath: Path to the file to parse
            file_type: Type of file ('company', 'supplier1', 'supplier2', 'supplier3', 'employee')
            
        Returns:
            List of dictionaries representing the file data
        """
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File not found: {filepath}")
        
        ext = os.path.splitext(filepath)[1].lower()
        
        if ext == '.csv':
            return self._parse_csv(filepath, file_type)
        elif ext in ['.xlsx', '.xls']:
            return self._parse_excel(filepath, file_type)
        else:
            raise ValueError(f"Unsupported file type: {ext}")
    
    def _parse_csv(self, filepath: str, file_type: str) -> List[Dict[str, Any]]:
        """Parse CSV file"""
        try:
            df = pd.read_csv(filepath, encoding='utf-8')
        except UnicodeDecodeError:
            # Try with different encoding
            df = pd.read_csv(filepath, encoding='utf-8-sig')
        
        # Convert to list of dictionaries
        return df.to_dict('records')
    
    def _parse_excel(self, filepath: str, file_type: str) -> List[Dict[str, Any]]:
        """Parse Excel file"""
        if file_type == 'supplier2':  # GETT file
            # Read ALL rows without header to avoid stopping at empty rows
            # Avoid nrows limit so we don't truncate rows 16-641
            df_all = pd.read_excel(filepath, header=None, engine='openpyxl')
            
            # Extract header row (row 15 in Excel = index 14 in 0-indexed)
            if len(df_all) > GETT_HEADER_ROW:
                header_row = df_all.iloc[GETT_HEADER_ROW]
                # Set header and start data from row 16 (index 15)
                df = df_all.iloc[GETT_HEADER_ROW + 1:].copy()
                df.columns = header_row
                df = df.reset_index(drop=True)
            else:
                raise ValueError(f"File does not contain expected header row at index {GETT_HEADER_ROW}")
            
            # For GETT, only drop rows where column D (מס' הזמנה) is NaN
            # This is the key field - if it's missing, it's not a valid trip
            if len(df) > 0 and len(df.columns) > GETT_COLUMN_INDICES['D']:
                col_d_name = df.columns[GETT_COLUMN_INDICES['D']]
                df = df[df[col_d_name].notna()].reset_index(drop=True)
            else:
                df = df.dropna(how='all')
        else:
            df = pd.read_excel(filepath, engine='openpyxl')
            # Remove rows with all NaN values
            df = df.dropna(how='all')
        
        # For GETT file, also store column names for direct access
        if file_type == 'supplier2':
            records = df.to_dict('records')
            # Add column names list to each record for reference
            for record in records:
                record['_column_names'] = list(df.columns)
            return records
        
        # Convert to list of dictionaries
        return df.to_dict('records')
    
    def get_file_info(self, filepath: str) -> Dict[str, Any]:
        """Get basic information about a file"""
        ext = os.path.splitext(filepath)[1].lower()
        
        if ext == '.csv':
            df = pd.read_csv(filepath, encoding='utf-8', nrows=1)
        elif ext in ['.xlsx', '.xls']:
            df = pd.read_excel(filepath, engine='openpyxl', nrows=1)
        else:
            raise ValueError(f"Unsupported file type: {ext}")
        
        return {
            'columns': list(df.columns),
            'row_count': len(pd.read_csv(filepath) if ext == '.csv' else pd.read_excel(filepath, engine='openpyxl'))
        }

