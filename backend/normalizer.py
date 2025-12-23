from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
import re
import pandas as pd

class Normalizer:
    """Normalize data from different file formats to a common structure"""
    
    def normalize_company(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Normalize company file data"""
        normalized = []
        
        for row in data:
            # Extract trip ID and skip summary rows
            trip_id_val = row.get('_ID', '')
            if self._is_summary_row(trip_id_val):
                continue
            
            if trip_id_val is None or (isinstance(trip_id_val, float) and pd.isna(trip_id_val)):
                trip_id = ''
            else:
                # Convert to string, handling both int and float
                trip_id = str(int(trip_id_val)) if isinstance(trip_id_val, (int, float)) and not pd.isna(trip_id_val) else str(trip_id_val).strip()
            
            # Extract date and time
            date_val = row.get('תאריך', '')
            date_str = str(date_val) if date_val is not None and (not isinstance(date_val, float) or not pd.isna(date_val)) else ''
            
            # Prefer order time if available; fallback to shift time
            preferred_time_keys = [
                'שעת הזמנה',
                'שעת התחלה',
                'שעת משמרת',
                'שעת הגעה',
                'שעת יציאה',
                'זמן הגעה',
                'זמן'
            ]
            time_val = None
            for tk in preferred_time_keys:
                val = row.get(tk, None)
                if val is not None and not (isinstance(val, float) and pd.isna(val)):
                    time_val = val
                    break
            if time_val is None:
                # Fallback: any key containing 'שעת'
                for k, v in row.items():
                    if 'שעת' in str(k) and v is not None and not (isinstance(v, float) and pd.isna(v)):
                        time_val = v
                        break
            time_str = str(time_val) if time_val is not None and (not isinstance(time_val, float) or not pd.isna(time_val)) else ''
            
            # Extract passengers
            passengers_val = row.get('נוסעים', '')
            passengers_str = str(passengers_val) if passengers_val is not None and (not isinstance(passengers_val, float) or not pd.isna(passengers_val)) else ''
            passengers = self._parse_passengers(passengers_str)
            
            # Extract source and destination
            source_val = row.get('מוצא', '')
            source = str(source_val) if source_val is not None and (not isinstance(source_val, float) or not pd.isna(source_val)) else ''
            
            destination_val = row.get('יעד', '')
            destination = str(destination_val) if destination_val is not None and (not isinstance(destination_val, float) or not pd.isna(destination_val)) else ''
            
            # Extract price
            price = self._parse_price(row.get('מחיר', 0))
            
            # Extract supplier
            supplier_val = row.get('ספק', '')
            supplier = str(supplier_val) if supplier_val is not None and (not isinstance(supplier_val, float) or not pd.isna(supplier_val)) else ''
            
            normalized.append({
                'trip_id': trip_id,
                'date': self._parse_date(date_str),
                'time': self._parse_time(time_str),
                'passengers': passengers,
                'source': self._clean_text(source),
                'destination': self._clean_text(destination),
                'price': price,
                'supplier': self._clean_text(supplier),
                'original_data': row
            })
        
        return normalized
    
    def normalize_supplier1(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Normalize Bon Tour (supplier1) file data"""
        normalized = []
        
        for row in data:
            # Extract trip ID and skip summary rows
            trip_id_val = row.get('מספר ויזה', '')
            if self._is_summary_row(trip_id_val):
                continue
            
            if trip_id_val is None or (isinstance(trip_id_val, float) and pd.isna(trip_id_val)):
                trip_id = ''
            else:
                # Convert to string, handling both int and float
                trip_id = str(int(trip_id_val)) if isinstance(trip_id_val, (int, float)) and not pd.isna(trip_id_val) else str(trip_id_val).strip()
            
            date_val = row.get('תאריך', '')
            date_str = str(date_val) if date_val is not None and (not isinstance(date_val, float) or not pd.isna(date_val)) else ''
            
            time_val = row.get('שעת התחלה', '')
            time_str = str(time_val) if time_val is not None and (not isinstance(time_val, float) or not pd.isna(time_val)) else ''
            
            desc_val = row.get('תאור', '')
            description = str(desc_val) if desc_val is not None and (not isinstance(desc_val, float) or not pd.isna(desc_val)) else ''
            
            # Extract price - try multiple possible column names
            price = self._extract_price_from_row(row, 'סה"כ ללקוח-לאחר הנחה')
            
            # Parse source and destination from description
            source, destination = self._parse_from_description(description)
            
            normalized.append({
                'trip_id': trip_id,
                'date': self._parse_date(date_str),
                'time': self._parse_time(time_str),
                'passengers': [],  # Not available in this file
                'source': source,
                'destination': destination,
                'price': price,
                'supplier': 'בון תור',
                'original_data': row
            })
        
        return normalized
    
    def normalize_supplier2(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Normalize GETT (supplier2) file data"""
        normalized = []
        
        for row in data:
            trip_id = self._extract_gett_trip_id(row)
            date, time = self._extract_gett_date_time(row)
            passengers = self._extract_gett_passengers(row)
            source = self._extract_gett_field(row, 'נק\' איסוף')
            destination = self._extract_gett_field(row, 'כתובת יעד')
            price = self._extract_gett_price(row)
            
            # Remove internal metadata before storing
            row_clean = {k: v for k, v in row.items() if k != '_column_names'}
            
            normalized.append({
                'trip_id': trip_id,
                'date': date,
                'time': time,
                'passengers': passengers,
                'source': self._clean_text(source),
                'destination': self._clean_text(destination),
                'price': price,
                'supplier': 'גט',
                'original_data': row_clean
            })
        
        return normalized
    
    def _extract_gett_trip_id(self, row: Dict[str, Any]) -> str:
        """Extract trip ID from GETT row (column D)"""
        from config import GETT_COLUMN_INDICES
        
        column_names = row.get('_column_names', [])
        trip_id_val = None
        
        # Try by column index first
        if len(column_names) > GETT_COLUMN_INDICES['D']:
            col_d_name = column_names[GETT_COLUMN_INDICES['D']]
            trip_id_val = row.get(col_d_name, '')
        
        # Also try by direct column name
        if not trip_id_val or (isinstance(trip_id_val, float) and pd.isna(trip_id_val)):
            trip_id_val = row.get('מס\' הזמנה', '')
            if not trip_id_val or (isinstance(trip_id_val, float) and pd.isna(trip_id_val)):
                trip_id_val = row.get("מס' הזמנה", '')
        
        # Convert to string
        trip_id = str(trip_id_val) if trip_id_val is not None and (not isinstance(trip_id_val, float) or not pd.isna(trip_id_val)) else ''
        return trip_id.strip()
    
    def _extract_gett_date_time(self, row: Dict[str, Any]) -> Tuple[str, str]:
        """Extract date and time from GETT row (column B)"""
        from config import GETT_COLUMN_INDICES
        
        column_names = row.get('_column_names', [])
        date_time_val = None
        
        # Try by column index first
        if len(column_names) > GETT_COLUMN_INDICES['B']:
            col_b_name = column_names[GETT_COLUMN_INDICES['B']]
            date_time_val = row.get(col_b_name, '')
        
        # Also try by direct column name
        if not date_time_val or (isinstance(date_time_val, float) and pd.isna(date_time_val)):
            date_time_val = row.get('מועד הנסיעה', '')
        
        date_time_str = str(date_time_val) if date_time_val is not None and (not isinstance(date_time_val, float) or not pd.isna(date_time_val)) else ''
        return self._parse_datetime(date_time_str)
    
    def _extract_gett_passengers(self, row: Dict[str, Any]) -> List[str]:
        """Extract passengers from GETT row (column L)"""
        from config import GETT_COLUMN_INDICES
        
        column_names = row.get('_column_names', [])
        passengers_val = None
        
        # Try by column index first
        if len(column_names) > GETT_COLUMN_INDICES['L']:
            col_l_name = column_names[GETT_COLUMN_INDICES['L']]
            passengers_val = row.get(col_l_name, '')
        
        # Also try by direct column name
        if not passengers_val or (isinstance(passengers_val, float) and pd.isna(passengers_val)):
            passengers_val = row.get('שם הנוסע', '')
        
        passengers_str = str(passengers_val) if passengers_val is not None and (not isinstance(passengers_val, float) or not pd.isna(passengers_val)) else ''
        return self._parse_passengers(passengers_str)
    
    def _extract_gett_price(self, row: Dict[str, Any]) -> float:
        """Extract price from GETT row (column K)"""
        from config import GETT_COLUMN_INDICES
        
        column_names = row.get('_column_names', [])
        price_val = None
        
        # Try by column index first
        if len(column_names) > GETT_COLUMN_INDICES['K']:
            col_k_name = column_names[GETT_COLUMN_INDICES['K']]
            price_val = row.get(col_k_name, 0)
        
        # Also try by direct column name
        if not price_val or (isinstance(price_val, float) and pd.isna(price_val)):
            price_val = row.get('סה"כ ללא מע"מ', 0)
            if not price_val or (isinstance(price_val, float) and pd.isna(price_val)):
                price_val = row.get('סה"כ', 0)
        
        return self._parse_price(price_val)
    
    def _extract_gett_field(self, row: Dict[str, Any], field_name: str) -> str:
        """Extract a simple text field from GETT row"""
        field_val = row.get(field_name, '')
        return str(field_val) if field_val is not None and (not isinstance(field_val, float) or not pd.isna(field_val)) else ''
    
    def normalize_supplier3(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Normalize Hori (supplier3) file data"""
        normalized = []
        
        for row in data:
            trip_id_val = row.get('מספר ויזה', '')
            if trip_id_val is None or (isinstance(trip_id_val, float) and pd.isna(trip_id_val)):
                trip_id = ''
            else:
                # Convert to string, handling both int and float
                trip_id = str(int(trip_id_val)) if isinstance(trip_id_val, (int, float)) and not pd.isna(trip_id_val) else str(trip_id_val).strip()
            
            date_val = row.get('תאריך', '')
            date_str = str(date_val) if date_val is not None and (not isinstance(date_val, float) or not pd.isna(date_val)) else ''
            
            time_val = row.get('שעת התחלה', '')
            time_str = str(time_val) if time_val is not None and (not isinstance(time_val, float) or not pd.isna(time_val)) else ''
            
            desc_val = row.get('תאור', '')
            description = str(desc_val) if desc_val is not None and (not isinstance(desc_val, float) or not pd.isna(desc_val)) else ''
            price = self._parse_price(row.get('סה"כ ללקוח-לפני מע"מ', 0))
            
            # Parse source and destination from description
            source, destination = self._parse_from_description(description)
            
            normalized.append({
                'trip_id': trip_id,
                'date': self._parse_date(date_str),
                'time': self._parse_time(time_str),
                'passengers': [],  # Not available in this file
                'source': source,
                'destination': destination,
                'price': price,
                'supplier': 'חורי',
                'original_data': row
            })
        
        return normalized
    
    def _parse_date(self, date_str: str) -> str:
        """Parse date string to YYYY-MM-DD format"""
        if not date_str or date_str == 'nan':
            return ''
        
        try:
            # Try different date formats
            from config import DATE_FORMATS
            for fmt in DATE_FORMATS:
                try:
                    dt = datetime.strptime(str(date_str).split()[0], fmt)
                    return dt.strftime('%Y-%m-%d')
                except:
                    continue
        except:
            pass
        
        return str(date_str).split()[0] if date_str else ''
    
    def _parse_time(self, time_str: str) -> str:
        """Parse time string to HH:MM format"""
        if not time_str or time_str == 'nan':
            return ''
        
        try:
            # Extract time from datetime string
            time_part = str(time_str).split()[-1] if ' ' in str(time_str) else str(time_str)
            # Try parsing
            from config import TIME_FORMATS
            for fmt in TIME_FORMATS:
                try:
                    dt = datetime.strptime(time_part, fmt)
                    return dt.strftime('%H:%M')
                except:
                    continue
        except:
            pass
        
        return str(time_str)
    
    def _parse_datetime(self, datetime_str: str) -> Tuple[str, str]:
        """Parse datetime string and return (date, time) as strings"""
        if not datetime_str or datetime_str == 'nan':
            return ('', '')
        
        try:
            # Convert to string first to avoid time objects
            dt_str = str(datetime_str)
            dt = pd.to_datetime(dt_str)
            # Ensure we return strings, not time objects
            date_str = dt.strftime('%Y-%m-%d') if hasattr(dt, 'strftime') else str(dt.date()) if hasattr(dt, 'date') else ''
            time_str = dt.strftime('%H:%M') if hasattr(dt, 'strftime') else str(dt.time()) if hasattr(dt, 'time') else ''
            return (date_str, time_str)
        except:
            # Try manual parsing
            parts = str(datetime_str).split()
            date = self._parse_date(parts[0]) if parts else ''
            time = self._parse_time(parts[-1]) if len(parts) > 1 else ''
            return (date, time)
    
    def _parse_passengers(self, passengers_str: str) -> List[str]:
        """Parse passengers string to list of names"""
        if not passengers_str or passengers_str == 'nan':
            return []
        
        # Split by common separators
        names = re.split(r'[;,\n]', str(passengers_str))
        # Clean and filter
        names = [name.strip() for name in names if name.strip()]
        return names
    
    def _extract_price_from_row(self, row: Dict[str, Any], primary_key: str) -> float:
        """Extract price from row, trying multiple possible column names"""
        # Try primary key first
        if primary_key in row:
            price = self._parse_price(row.get(primary_key))
            if price > 0:
                return price
        
        # Try other possible column names
        price_keys = ['סה"כ ללקוח-לאחר הנחה', 'סה"כ ללקוח לאחר הנחה', 'סה"כ', 'מחיר', 'סה"כ ללקוח', 'סה"כ ללקוח-לפני הנחה']
        for key in price_keys:
            if key in row and key != primary_key:
                price = self._parse_price(row.get(key))
                if price > 0:
                    return price
        
        # Try to find any numeric column that might be price (reasonable range)
        for col_name, col_value in row.items():
            if isinstance(col_value, (int, float)) and not pd.isna(col_value) and 10 <= col_value <= 10000:
                price = self._parse_price(col_value)
                if price > 0:
                    return price
        
        return 0.0
    
    def _parse_price(self, price: Any) -> float:
        """Parse price to float, handling NaN and None"""
        if price is None or (isinstance(price, float) and pd.isna(price)):
            return 0.0
        
        try:
            price_str = str(price).replace('₪', '').replace(',', '').strip()
            result = float(price_str)
            if pd.isna(result) or result != result:  # NaN check
                return 0.0
            return result
        except (ValueError, TypeError):
            return 0.0
    
    def _parse_from_description(self, description: str) -> Tuple[str, str]:
        """Parse source and destination from description field"""
        if not description or description == 'nan':
            return ('', '')
        
        desc = str(description)
        
        # Patterns: "איסוף: X - Y" or "פיזור: X - Y"
        if 'איסוף:' in desc or 'פיזור:' in desc:
            parts = desc.split('-')
            if len(parts) >= 2:
                source = parts[0].split(':')[-1].strip() if ':' in parts[0] else parts[0].strip()
                destination = parts[-1].strip()
                return (self._clean_text(source), self._clean_text(destination))
        
        return ('', '')
    
    def _clean_text(self, text: str) -> str:
        """Clean text from special characters and normalize"""
        if not text or text == 'nan':
            return ''
        
        # Remove pipe characters and other special markers
        text = str(text).replace('|', '').strip()
        return text
    
    def normalize_employee(self, data: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """Normalize employee database and create lookup maps"""
        employee_map = {}
        employee_by_name = {}
        employee_by_id = {}
        
        for row in data:
            # Extract employee ID
            emp_id_val = row.get('_ID', '')
            if emp_id_val is None or (isinstance(emp_id_val, float) and pd.isna(emp_id_val)):
                emp_id = ''
            else:
                emp_id = str(int(emp_id_val)) if isinstance(emp_id_val, (int, float)) and not pd.isna(emp_id_val) else str(emp_id_val).strip()
            
            # Extract first and last name
            first_name_val = row.get('שם פרטי', '')
            first_name = str(first_name_val).strip() if first_name_val is not None and (not isinstance(first_name_val, float) or not pd.isna(first_name_val)) else ''
            
            last_name_val = row.get('שם משפחה', '')
            last_name = str(last_name_val).strip() if last_name_val is not None and (not isinstance(last_name_val, float) or not pd.isna(last_name_val)) else ''
            
            # Extract department
            dept_val = row.get('מחלקה', '')
            department = str(dept_val).strip() if dept_val is not None and (not isinstance(dept_val, float) or not pd.isna(dept_val)) else ''
            
            # Extract employee number (מספר נוסע)
            emp_num_val = row.get('מספר נוסע', '')
            emp_num = ''
            if emp_num_val is not None and (not isinstance(emp_num_val, float) or not pd.isna(emp_num_val)):
                emp_num = str(int(emp_num_val)) if isinstance(emp_num_val, (int, float)) else str(emp_num_val).strip()
            
            # Build full name (normalized for matching)
            full_name = f"{first_name} {last_name}".strip()
            full_name_normalized = self._normalize_name_for_matching(full_name)
            
            # Create employee record
            employee = {
                'id': emp_id,
                'first_name': first_name,
                'last_name': last_name,
                'full_name': full_name,
                'full_name_normalized': full_name_normalized,
                'department': department,
                'employee_number': emp_num,
                'original_data': row
            }
            
            # Index by ID
            if emp_id:
                employee_by_id[emp_id] = employee
            
            # Index by employee number (if different from ID)
            if emp_num and emp_num != emp_id:
                employee_by_id[emp_num] = employee
            
            # Index by normalized full name
            if full_name_normalized:
                if full_name_normalized not in employee_by_name:
                    employee_by_name[full_name_normalized] = []
                employee_by_name[full_name_normalized].append(employee)
            
            # Also index by first+last separately (for partial matches)
            if first_name and last_name:
                key = self._normalize_name_for_matching(f"{first_name} {last_name}")
                if key not in employee_by_name:
                    employee_by_name[key] = []
                employee_by_name[key].append(employee)
        
        # Create list of unique employees (using dict to deduplicate)
        unique_employees = {}
        for emp in employee_by_id.values():
            emp_key = emp.get('id', '') or emp.get('employee_number', '')
            if emp_key:
                unique_employees[emp_key] = emp
        
        employee_map = {
            'by_id': employee_by_id,
            'by_name': employee_by_name,
            'all_employees': list(unique_employees.values()) if unique_employees else []
        }
        
        return employee_map
    
    def _is_summary_row(self, trip_id_val: Any) -> bool:
        """Check if a row is a summary row based on trip_id"""
        if trip_id_val is None or (isinstance(trip_id_val, float) and pd.isna(trip_id_val)):
            return False
        
        trip_id_str = str(trip_id_val).strip()
        if not trip_id_str or trip_id_str == 'nan':
            return False
        
        # Check for common summary indicators
        summary_indicators = ['סה"כ', 'סה כ', 'total', 'sum', 'סיכום', 'summary']
        if any(indicator.lower() in trip_id_str.lower() for indicator in summary_indicators):
            return True
        
        # Check if trip_id is not numeric (likely a summary row)
        try:
            int(trip_id_str)
            return False
        except (ValueError, TypeError):
            return True
    
    def _normalize_name_for_matching(self, name: str) -> str:
        """Normalize name for matching (remove extra spaces, special chars)"""
        if not name:
            return ''
        normalized = ' '.join(name.split()).strip()
        return normalized

