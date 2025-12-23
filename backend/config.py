"""Configuration constants and settings for the application"""
import os
from pathlib import Path

# File upload settings
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB max file size

# GETT file structure settings
GETT_HEADER_ROW = 14  # 0-indexed: row 14 contains headers
GETT_DATA_START_ROW = 16  # 0-indexed: row 16 is first data row (after skipping empty row 15)
GETT_COLUMN_INDICES = {
    'B': 1,   # מועד הנסיעה (trip date/time)
    'D': 3,   # מס' הזמנה (order number / trip_id)
    'G': 6,   # נק' איסוף (source)
    'H': 7,   # כתובת יעד (destination)
    'K': 10,  # מחיר ספק (price)
    'L': 11   # שם הנוסע (passengers)
}

# Matching algorithm settings
FUZZY_MATCH_THRESHOLD = 70  # Minimum similarity score for fuzzy matching
PRICE_DIFFERENCE_THRESHOLD = 0.01  # Minimum price difference to flag (in currency units)
TIME_MATCH_TOLERANCE_MINUTES = 5  # Time matching tolerance in minutes
LOCATION_MATCH_SIMILARITY_THRESHOLD = 95  # Location fuzzy match threshold (percentage)

# Supplier names
SUPPLIER_NAMES = {
    'GETT': ['גט', 'gett'],
    'BON_TOUR': 'צוות גיל',
    'HORI': 'חורי'
}

# Date and time formats
DATE_FORMATS = ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y', '%Y/%m/%d', '%d.%m.%Y']
TIME_FORMATS = ['%H:%M:%S', '%H:%M']

# Summary row indicators
SUMMARY_ROW_INDICATORS = ['סה"כ', 'סה כ', 'total', 'sum', 'סיכום', 'summary']

# Paths
def get_backend_dir() -> Path:
    """Get backend directory path"""
    return Path(__file__).parent.absolute()

def get_workspace_root() -> Path:
    """Get workspace root directory path"""
    return get_backend_dir().parent

def get_upload_folder() -> Path:
    """Get upload folder path, create if doesn't exist"""
    upload_path = get_backend_dir() / UPLOAD_FOLDER
    upload_path.mkdir(exist_ok=True)
    return upload_path

