"""File comparison endpoints"""
from flask import request, jsonify
from typing import Dict, Any
from file_parser import FileParser
from normalizer import Normalizer
from matcher import Matcher
from department_allocator import DepartmentAllocator
from config import SUPPLIER_NAMES
from utils import make_serializable, filter_company_trips_by_supplier
from flask import Blueprint

api = Blueprint('compare', __name__)

def _find_registered_on_other_supplier(comparison_result: Dict[str, Any], 
                                       company_all: list) -> list:
    """Find supplier trips that exist in company data but under a different supplier.

    Logic:
    - comparison_result['missing_in_company'] currently holds all supplier trips
      that weren't matched against the *filtered* company trips for this supplier.
    - Some of those trips may exist in company_all but with a different supplier name
      (the "registered on other supplier" case we want to surface).
    - We separate them out and return a structured list, while keeping truly-missing
      trips in comparison_result['missing_in_company'].
    """
    # Build lookup of all company trips by trip_id
    company_by_id = {}
    for trip in company_all or []:
        trip_id = str(trip.get('trip_id', '')).strip()
        if trip_id:
            company_by_id[trip_id] = trip

    registered_elsewhere = []
    still_missing = []

    for supplier_trip in comparison_result.get('missing_in_company', []) or []:
        trip_id = str(supplier_trip.get('trip_id', '')).strip()
        if not trip_id:
            still_missing.append(supplier_trip)
            continue

        company_trip = company_by_id.get(trip_id)
        if company_trip:
            # Trip exists in company but under a (possibly) different supplier
            registered_elsewhere.append({
                'trip_id': trip_id,
                'date': company_trip.get('date') or supplier_trip.get('date', ''),
                'time': company_trip.get('time') or supplier_trip.get('time', ''),
                'source': company_trip.get('source') or supplier_trip.get('source', ''),
                'destination': company_trip.get('destination') or supplier_trip.get('destination', ''),
                'passengers': company_trip.get('passengers', []),
                'supplier_price': supplier_trip.get('price', 0),
                'company_price': company_trip.get('price', 0),
                'registered_supplier': company_trip.get('supplier', ''),
                'company_trip': company_trip,
                'supplier_trip': supplier_trip,
            })
        else:
            # Truly missing in company data
            still_missing.append(supplier_trip)

    # Update comparison_result in-place to keep only truly-missing trips there
    comparison_result['missing_in_company'] = still_missing
    return registered_elsewhere


def _format_comparison_result(comparison_result: Dict[str, Any], 
                              company_filtered: list,
                              supplier_key: str,
                              registered_on_other_supplier: list | None = None) -> Dict[str, Any]:
    """Format comparison result to expected structure"""
    return {
        'company_trips': company_filtered,
        'matches': {
            supplier_key: comparison_result['matches']
        },
        'missing_in_suppliers': {
            supplier_key: comparison_result['missing_in_supplier']
        },
        'extra_in_suppliers': {
            supplier_key: comparison_result['missing_in_company']
        },
        'price_differences': {
            supplier_key: comparison_result['price_differences']
        },
        'registered_on_other_supplier': {
            supplier_key: registered_on_other_supplier or []
        },
        'statistics': {
            supplier_key: {
                'total_company_trips': len(company_filtered),
                'matched': len(comparison_result['matches']),
                'missing': len(comparison_result['missing_in_supplier']),
                'extra': len(comparison_result['missing_in_company']),
                'price_differences': len(comparison_result['price_differences']),
                'match_rate': (len(comparison_result['matches']) / len(company_filtered) * 100) 
                             if company_filtered else 0
            }
        }
    }

@api.route('/compare', methods=['POST'])
def compare_files():
    """Compare company file with supplier files"""
    data = request.json
    files = data.get('files', {})
    
    if not files.get('company'):
        return jsonify({'error': 'Company file is required'}), 400
    
    try:
        parser = FileParser()
        normalizer = Normalizer()
        matcher = Matcher()
        
        # Parse and normalize all files
        company_data = parser.parse_file(files['company'], 'company')
        company_normalized = normalizer.normalize_company(company_data)
        
        suppliers_normalized = {}
        if files.get('supplier1'):
            supplier1_data = parser.parse_file(files['supplier1'], 'supplier1')
            suppliers_normalized['supplier1'] = normalizer.normalize_supplier1(supplier1_data)
        
        if files.get('supplier3'):
            supplier3_data = parser.parse_file(files['supplier3'], 'supplier3')
            suppliers_normalized['supplier3'] = normalizer.normalize_supplier3(supplier3_data)
        
        # Use simple ID-based comparison if only company and supplier1 are provided
        if files.get('supplier1') and not files.get('supplier2') and not files.get('supplier3'):
            # Filter company trips to only those with supplier "צוות גיל" for Bon Tour comparison
            company_filtered = [
                trip for trip in company_normalized 
                if trip.get('supplier', '').strip() == SUPPLIER_NAMES['BON_TOUR']
            ]
            
            # Simple comparison by ID only
            comparison_result = matcher.compare_by_id(company_filtered, suppliers_normalized['supplier1'])

            # Find trips that exist in company but under a different supplier
            registered_on_other = _find_registered_on_other_supplier(comparison_result, company_normalized)
            
            # Convert to the expected format
            results = _format_comparison_result(
                comparison_result,
                company_filtered,
                'supplier1',
                registered_on_other_supplier=registered_on_other
            )
            
        elif files.get('supplier3') and not files.get('supplier1'):
            # Filter company trips to only those with supplier "חורי" for Hori comparison
            company_filtered = filter_company_trips_by_supplier(
                company_normalized, 
                [SUPPLIER_NAMES['HORI']]
            )
            
            # Simple comparison by ID only
            comparison_result = matcher.compare_by_id(company_filtered, suppliers_normalized['supplier3'])

            # Find trips that exist in company but under a different supplier
            registered_on_other = _find_registered_on_other_supplier(comparison_result, company_normalized)
            
            # Convert to the expected format
            results = _format_comparison_result(
                comparison_result,
                company_filtered,
                'supplier3',
                registered_on_other_supplier=registered_on_other
            )
        else:
            # Use full matching for multiple suppliers
            results = matcher.match_all(company_normalized, suppliers_normalized)
        
        # Handle employee DB and department allocation if provided
        department_allocations = None
        if files.get('employee'):
            employee_data = parser.parse_file(files['employee'], 'employee')
            employee_map = normalizer.normalize_employee(employee_data)
            
            # Allocate rides to departments
            allocator = DepartmentAllocator(employee_map)
            department_allocations = allocator.allocate_rides(company_normalized)
        
        # Convert results to JSON-serializable format
        results_serializable = make_serializable(results)
        department_allocations_serializable = make_serializable(department_allocations) if department_allocations else None
        
        return jsonify({
            'success': True,
            'results': results_serializable,
            'department_allocations': department_allocations_serializable
        })
    except Exception as e:
        import traceback
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

