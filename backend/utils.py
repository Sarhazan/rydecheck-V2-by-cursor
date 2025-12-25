"""Utility functions for the application"""
import datetime
import math
from typing import Any, Dict, List, Optional
import pandas as pd


def make_serializable(obj: Any) -> Any:
    """
    Convert an object to JSON-serializable format.
    
    Handles:
    - None values
    - Dictionaries and lists (recursively)
    - Datetime objects (converted to strings)
    - NaN and infinity floats (converted to None)
    - Pandas NA values (converted to None)
    - Objects with __dict__ attribute
    
    Args:
        obj: Object to serialize
        
    Returns:
        JSON-serializable version of the object
    """
    if obj is None:
        return None
    
    if isinstance(obj, dict):
        return {k: make_serializable(v) for k, v in obj.items()}
    
    if isinstance(obj, list):
        return [make_serializable(item) for item in obj]
    
    if isinstance(obj, (datetime.datetime, datetime.date, datetime.time)):
        return str(obj)
    
    if isinstance(obj, float):
        if math.isnan(obj) or pd.isna(obj) or math.isinf(obj):
            return None
        return obj
    
    if pd.isna(obj):
        return None
    
    if hasattr(obj, '__dict__'):
        return make_serializable(obj.__dict__)
    
    return obj


def allowed_file(filename: str) -> bool:
    """
    Check if a file has an allowed extension.
    
    Args:
        filename: Name of the file to check
        
    Returns:
        True if file extension is allowed, False otherwise
    """
    from config import ALLOWED_EXTENSIONS
    
    if '.' not in filename:
        return False
    
    extension = filename.rsplit('.', 1)[1].lower()
    return extension in ALLOWED_EXTENSIONS


def filter_company_trips_by_supplier(
    trips: List[Dict[str, Any]], 
    supplier_names: List[str]
) -> List[Dict[str, Any]]:
    """
    Filter company trips by supplier name(s).
    
    Args:
        trips: List of trip dictionaries
        supplier_names: List of supplier names to filter by (case-insensitive)
        
    Returns:
        Filtered list of trips
    """
    filtered = []
    for trip in trips:
        supplier_val = str(trip.get('supplier', '')).strip().lower()
        for supplier_name in supplier_names:
            supplier_name_lower = supplier_name.lower()
            if (supplier_val == supplier_name_lower or 
                supplier_name_lower in supplier_val or
                supplier_name in supplier_val):
                filtered.append(trip)
                break
    return filtered


def clean_dict_for_logging(data: Dict[str, Any], exclude_keys: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Clean dictionary for logging by removing large or sensitive fields.
    
    Args:
        data: Dictionary to clean
        exclude_keys: List of keys to exclude (default: ['original_data'])
        
    Returns:
        Cleaned dictionary
    """
    if exclude_keys is None:
        exclude_keys = ['original_data']
    
    return {k: v for k, v in data.items() if k not in exclude_keys}

