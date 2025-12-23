from typing import List, Dict, Any, Tuple, Optional, Set
import re

class DepartmentAllocator:
    """Allocate ride costs to departments based on employee participation"""
    
    def __init__(self, employee_map: Dict[str, Any]):
        """
        Initialize with employee lookup map from Normalizer
        
        employee_map structure:
        {
            'by_id': {employee_id: employee_record, ...},
            'by_name': {normalized_name: [employee_records], ...},
            'all_employees': [...]
        }
        """
        self.employee_by_id = employee_map.get('by_id', {})
        self.employee_by_name = employee_map.get('by_name', {})
    
    def allocate_rides(self, company_rides: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Allocate costs for all company rides to departments
        
        Returns:
        {
            'department_allocations': {
                'Department Name': {
                    'total_cost': float,
                    'ride_count': int,
                    'rides': [...]
                }
            },
            'ride_allocations': [
                {
                    'ride': {...},
                    'departments': {
                        'Department Name': {
                            'employees': [...],
                            'allocation': float,
                            'percentage': float
                        }
                    }
                }
            ],
            'unassigned': {
                'total_cost': float,
                'ride_count': int,
                'rides': [...]
            }
        }
        """
        department_allocations = {}
        ride_allocations = []
        unassigned_rides = []
        
        for ride in company_rides:
            ride_allocation = self.allocate_ride(ride)
            ride_allocations.append(ride_allocation)
            
            # Aggregate by department
            for dept_name, dept_info in ride_allocation['departments'].items():
                if dept_name not in department_allocations:
                    department_allocations[dept_name] = {
                        'total_cost': 0.0,
                        'ride_count': 0,
                        'rides': []
                    }
                
                department_allocations[dept_name]['total_cost'] += dept_info['allocation']
                department_allocations[dept_name]['ride_count'] += 1
                department_allocations[dept_name]['rides'].append({
                    'ride': ride,
                    'allocation': dept_info['allocation'],
                    'percentage': dept_info['percentage'],
                    'employees': dept_info['employees']
                })
        
        # Handle unassigned
        unassigned = {
            'total_cost': sum(r['allocation'] for r in ride_allocations if not r['departments']),
            'ride_count': sum(1 for r in ride_allocations if not r['departments']),
            'rides': [r['ride'] for r in ride_allocations if not r['departments']]
        }
        
        return {
            'department_allocations': department_allocations,
            'ride_allocations': ride_allocations,
            'unassigned': unassigned
        }
    
    def allocate_ride(self, ride: Dict[str, Any]) -> Dict[str, Any]:
        """
        Allocate cost of a single ride to departments
        
        Returns:
        {
            'ride': ride_dict,
            'departments': {
                'Department Name': {
                    'employees': [employee_records],
                    'allocation': float,
                    'percentage': float
                }
            }
        }
        """
        passengers = ride.get('passengers', [])
        ride_price = ride.get('price', 0.0) or 0.0
        
        # Match passengers to employees (avoid duplicates)
        employee_matches = []
        seen_employee_ids = set()
        for passenger_str in passengers:
            employee = self._match_passenger_to_employee(passenger_str)
            if employee:
                emp_id = employee.get('id', '') or employee.get('employee_number', '')
                # Only add if we haven't seen this employee in this ride
                if emp_id and emp_id not in seen_employee_ids:
                    employee_matches.append(employee)
                    seen_employee_ids.add(emp_id)
                elif not emp_id:  # If no ID, add anyway (might be duplicate but can't check)
                    employee_matches.append(employee)
        
        # Group employees by department
        dept_groups = {}
        for emp in employee_matches:
            dept = emp.get('department', 'Unassigned')
            if dept and dept.strip():
                dept = dept.strip()
            else:
                dept = 'Unassigned'
            if dept not in dept_groups:
                dept_groups[dept] = []
            dept_groups[dept].append(emp)
        
        # Calculate proportional allocation
        departments = {}
        if dept_groups:
            total_employees = len(employee_matches)
            for dept_name, employees in dept_groups.items():
                employee_count = len(employees)
                percentage = (employee_count / total_employees) * 100
                allocation = (employee_count / total_employees) * ride_price
                
                departments[dept_name] = {
                    'employees': employees,
                    'allocation': round(allocation, 2),
                    'percentage': round(percentage, 2)
                }
        else:
            # No employees matched - mark as unassigned
            departments['Unassigned'] = {
                'employees': [],
                'allocation': ride_price,
                'percentage': 100.0
            }
        
        return {
            'ride': ride,
            'departments': departments
        }
    
    def _match_passenger_to_employee(self, passenger_str: str) -> Optional[Dict[str, Any]]:
        """
        Match a passenger string to an employee record
        
        Passenger strings can be in formats like:
        - "מאיר אלימלך 41200;"
        - "שלי שני ** 40170;"
        - "יחזקאל חזי  עקיבא  43313;"
        """
        if not passenger_str:
            return None
        
        # Clean passenger string
        passenger_str = str(passenger_str).strip()
        
        # Try to extract employee number first (numbers at the end)
        emp_num_match = re.search(r'(\d+)\s*;?\s*$', passenger_str)
        if emp_num_match:
            emp_num = emp_num_match.group(1)
            if emp_num in self.employee_by_id:
                return self.employee_by_id[emp_num]
        
        # Extract name parts (remove employee number and special chars)
        name_part = re.sub(r'\s*\d+\s*;?\s*$', '', passenger_str)  # Remove trailing numbers
        name_part = re.sub(r'\s*\*\*?\s*', ' ', name_part)  # Remove **
        name_part = ' '.join(name_part.split())  # Normalize spaces
        
        if not name_part:
            return None
        
        # Normalize name for matching
        normalized_name = self._normalize_name_for_matching(name_part)
        
        # Try exact match
        if normalized_name in self.employee_by_name:
            matches = self.employee_by_name[normalized_name]
            if matches:
                return matches[0]  # Return first match if multiple
        
        # Try partial match (split into words)
        name_parts = normalized_name.split()
        if len(name_parts) >= 2:
            # Try first + last name
            first_last = f"{name_parts[0]} {name_parts[-1]}"
            first_last_normalized = self._normalize_name_for_matching(first_last)
            if first_last_normalized in self.employee_by_name:
                matches = self.employee_by_name[first_last_normalized]
                if matches:
                    return matches[0]
            
            # Try with all words except the last (for middle names)
            if len(name_parts) >= 3:
                first_middle = ' '.join(name_parts[:-1])
                first_middle_normalized = self._normalize_name_for_matching(first_middle)
                if first_middle_normalized in self.employee_by_name:
                    matches = self.employee_by_name[first_middle_normalized]
                    if matches:
                        return matches[0]
        
        return None
    
    def _normalize_name_for_matching(self, name: str) -> str:
        """Normalize name for matching"""
        if not name:
            return ''
        # Remove extra spaces and normalize
        normalized = ' '.join(name.split()).strip()
        return normalized

