"""GETT-specific endpoints"""
import pandas as pd
from flask import request, jsonify
from file_parser import FileParser
from normalizer import Normalizer
from matcher import Matcher
from config import (
    GETT_HEADER_ROW, 
    GETT_COLUMN_INDICES, 
    SUPPLIER_NAMES
)
from utils import make_serializable, filter_company_trips_by_supplier
from flask import Blueprint

api = Blueprint('gett', __name__)

@api.route('/match-gett', methods=['POST'])
def match_gett():
    """Match GETT trips with company trips"""
    data = request.json
    company_file = data.get('company')
    gett_file = data.get('gett')
    
    if not company_file or not gett_file:
        return jsonify({'error': 'Company and GETT files are required'}), 400
    
    try:
        parser = FileParser()
        normalizer = Normalizer()
        matcher = Matcher()
        
        # Parse and normalize files
        company_data = parser.parse_file(company_file, 'company')
        company_normalized = normalizer.normalize_company(company_data)
        
        gett_data = parser.parse_file(gett_file, 'supplier2')
        gett_normalized = normalizer.normalize_supplier2(gett_data)
        
        # Filter company trips to only those with supplier "גט" or "gett"
        company_filtered = filter_company_trips_by_supplier(
            company_normalized, 
            SUPPLIER_NAMES['GETT']
        )
        
        # Perform matching with error guard
        try:
            match_result = matcher.match_gett_trips(company_filtered, gett_normalized)
        except Exception as e:
            import traceback, json, os
            from datetime import datetime
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            workspace_root = os.path.dirname(backend_dir)
            debug_log_path = os.path.join(workspace_root, '.cursor', 'debug.log')
            os.makedirs(os.path.dirname(debug_log_path), exist_ok=True)
            with open(debug_log_path, 'a', encoding='utf-8') as f:
                f.write(json.dumps({
                    'timestamp': str(datetime.now()),
                    'location': 'routes/gett.py:match_gett',
                    'message': 'match_gett_trips exception',
                    'data': {
                        'error': str(e),
                        'traceback': traceback.format_exc(),
                        'company_count': len(company_filtered),
                        'gett_count': len(gett_normalized)
                    },
                    'sessionId': 'debug-session',
                    'runId': 'post-fix',
                    'hypothesisId': 'H2'
                }, ensure_ascii=False) + '\n')
                f.flush()
            return jsonify({'error': str(e)}), 500
        
        # Convert to JSON-serializable format
        result_serializable = make_serializable(match_result)
        
        # Convert to ComparisonResult format
        comparison_result = {
            'company_trips': [],
            'matches': {
                'supplier2': result_serializable['matches']
            },
            'missing_in_suppliers': {
                'supplier2': result_serializable['unmatched_company']
            },
            'extra_in_suppliers': {
                'supplier2': result_serializable['unmatched_gett']
            },
            'price_differences': {
                'supplier2': []
            },
            'statistics': {
                'supplier2': {
                    'total_company_trips': len(company_filtered),
                    'matched': result_serializable['matched_count'],
                    'missing': len(result_serializable['unmatched_company']),
                    'extra': len(result_serializable['unmatched_gett']),
                    'price_differences': 0,
                    'match_rate': (result_serializable['matched_count'] / len(company_filtered) * 100) 
                                 if len(company_filtered) > 0 else 0
                }
            }
        }
        
        # Use manual dumps to avoid Flask sorting keys that can include numpy types
        import json
        from flask import current_app
        return current_app.response_class(
            response=json.dumps({'success': True, 'results': comparison_result}, ensure_ascii=False, sort_keys=False, default=str),
            status=200,
            mimetype='application/json'
        )
        
    except Exception as e:
        import traceback, json, os
        from datetime import datetime
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        workspace_root = os.path.dirname(backend_dir)
        debug_log_path = os.path.join(workspace_root, '.cursor', 'debug.log')
        os.makedirs(os.path.dirname(debug_log_path), exist_ok=True)
        try:
            with open(debug_log_path, 'a', encoding='utf-8') as f:
                f.write(json.dumps({
                    'timestamp': str(datetime.now()),
                    'location': 'routes/gett.py:match_gett outer',
                    'message': 'match_gett exception',
                    'data': {
                        'error': str(e),
                        'traceback': traceback.format_exc()
                    },
                    'sessionId': 'debug-session',
                    'runId': 'post-fix',
                    'hypothesisId': 'H3'
                }, ensure_ascii=False) + '\n')
                f.flush()
        except Exception:
            pass
        return jsonify({'error': str(e)}), 500


@api.route('/ride-gett-columns', methods=['POST'])
def ride_gett_columns():
    """
    Return Ride trips with supplier GETT/גט and selected columns (A,B,O,P approximated):
    - A: _ID (trip_id after normalization)
    - B: תאריך
    - O: מוצא (source)
    - P: יעד (destination)
    """
    data = request.json
    filename = data.get('filename')
    if not filename:
        return jsonify({'error': 'Filename is required'}), 400

    try:
        parser = FileParser()
        normalizer = Normalizer()

        company_data = parser.parse_file(filename, 'company')
        company_normalized = normalizer.normalize_company(company_data)
        company_filtered = filter_company_trips_by_supplier(
            company_normalized,
            SUPPLIER_NAMES['GETT']
        )

        rows = []
        for trip in company_filtered:
            rows.append({
                'col_A': trip.get('trip_id', ''),
                'col_B': trip.get('date', ''),
                'col_O': trip.get('source', ''),
                'col_P': trip.get('destination', ''),
            })

        headers = {
            'col_A': 'מספר נסיעה (חברה)',
            'col_B': 'תאריך',
            'col_O': 'מקור',
            'col_P': 'יעד'
        }

        return jsonify({
            'success': True,
            'headers': headers,
            'data': rows,
            'row_count': len(rows)
        })
    except Exception as e:
        import traceback, json, os
        from datetime import datetime
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        workspace_root = os.path.dirname(backend_dir)
        debug_log_path = os.path.join(workspace_root, '.cursor', 'debug.log')
        os.makedirs(os.path.dirname(debug_log_path), exist_ok=True)
        with open(debug_log_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps({
                'timestamp': str(datetime.now()),
                'location': 'routes/gett.py:ride_gett_columns',
                'message': 'ride_gett_columns exception',
                'data': {
                    'error': str(e),
                    'traceback': traceback.format_exc()
                },
                'sessionId': 'debug-session',
                'runId': 'post-fix',
                'hypothesisId': 'H-ride-cols'
            }, ensure_ascii=False) + '\n')
            f.flush()
        return jsonify({'error': str(e)}), 500


@api.route('/gett-next', methods=['POST'])
def gett_next():
    """
    Return the next single GETT trip and the first Ride (supplier GETT) trip on the same date.
    Selection rule: first GETT trip by order (index) vs first Ride trip with same date.
    """
    data = request.json
    company_file = data.get('company')
    gett_file = data.get('gett')
    index = int(data.get('index', 0))

    if not company_file or not gett_file:
        return jsonify({'error': 'Company and GETT files are required'}), 400

    try:
        parser = FileParser()
        normalizer = Normalizer()

        company_data = parser.parse_file(company_file, 'company')
        company_normalized = normalizer.normalize_company(company_data)
        company_filtered = filter_company_trips_by_supplier(
            company_normalized,
            SUPPLIER_NAMES['GETT']
        )

        gett_data = parser.parse_file(gett_file, 'supplier2')
        gett_normalized = normalizer.normalize_supplier2(gett_data)

        total_gett = len(gett_normalized)
        if index < 0:
            index = 0
        if index >= total_gett:
            return jsonify({
                'success': True,
                'done': True,
                'total_gett': total_gett,
                'remaining': 0
            })

        gett_trip = gett_normalized[index]
        target_date = str(gett_trip.get('date', ''))
        company_match = None
        for trip in company_filtered:
            if str(trip.get('date', '')) == target_date:
                company_match = trip
                break

        return jsonify({
            'success': True,
            'done': False,
            'index': index,
            'total_gett': total_gett,
            'remaining': max(total_gett - index - 1, 0),
            'gett_trip': make_serializable(gett_trip),
            'company_trip': make_serializable(company_match)
        })
    except Exception as e:
        import traceback, json, os
        from datetime import datetime
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        workspace_root = os.path.dirname(backend_dir)
        debug_log_path = os.path.join(workspace_root, '.cursor', 'debug.log')
        os.makedirs(os.path.dirname(debug_log_path), exist_ok=True)
        with open(debug_log_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps({
                'timestamp': str(datetime.now()),
                'location': 'routes/gett.py:gett_next',
                'message': 'gett_next exception',
                'data': {
                    'error': str(e),
                    'traceback': traceback.format_exc()
                },
                'sessionId': 'debug-session',
                'runId': 'post-fix',
                'hypothesisId': 'H-next'
            }, ensure_ascii=False) + '\n')
            f.flush()
        return jsonify({'error': str(e)}), 500


@api.route('/gett-confirm', methods=['POST'])
def gett_confirm():
    """
    Confirm or skip the current GETT->Ride pairing.
    Client provides index and decision ('approve'|'skip').
    Response returns next pair info.
    """
    data = request.json
    company_file = data.get('company')
    gett_file = data.get('gett')
    index = int(data.get('index', 0))
    decision = data.get('decision', 'skip')

    if not company_file or not gett_file:
        return jsonify({'error': 'Company and GETT files are required'}), 400

    try:
        parser = FileParser()
        normalizer = Normalizer()

        company_data = parser.parse_file(company_file, 'company')
        company_normalized = normalizer.normalize_company(company_data)
        company_filtered = filter_company_trips_by_supplier(
            company_normalized,
            SUPPLIER_NAMES['GETT']
        )

        gett_data = parser.parse_file(gett_file, 'supplier2')
        gett_normalized = normalizer.normalize_supplier2(gett_data)

        total_gett = len(gett_normalized)
        if index < 0:
            index = 0
        if index >= total_gett:
            return jsonify({
                'success': True,
                'done': True,
                'total_gett': total_gett,
                'remaining': 0
            })

        gett_trip = gett_normalized[index]
        target_date = str(gett_trip.get('date', ''))
        company_match = None
        for trip in company_filtered:
            if str(trip.get('date', '')) == target_date:
                company_match = trip
                break

        approved = decision == 'approve' and company_match is not None

        next_index = index + 1
        next_pair = None
        if next_index < total_gett:
            next_gett_trip = gett_normalized[next_index]
            next_target_date = str(next_gett_trip.get('date', ''))
            next_company = None
            for trip in company_filtered:
                if str(trip.get('date', '')) == next_target_date:
                    next_company = trip
                    break
            next_pair = {
                'index': next_index,
                'gett_trip': make_serializable(next_gett_trip),
                'company_trip': make_serializable(next_company)
            }

        return jsonify({
            'success': True,
            'decision': decision,
            'approved': approved,
            'index': index,
            'total_gett': total_gett,
            'remaining': max(total_gett - index - 1, 0),
            'pair': {
                'gett_trip': make_serializable(gett_trip),
                'company_trip': make_serializable(company_match)
            },
            'next_pair': next_pair
        })
    except Exception as e:
        import traceback, json, os
        from datetime import datetime
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        workspace_root = os.path.dirname(backend_dir)
        debug_log_path = os.path.join(workspace_root, '.cursor', 'debug.log')
        os.makedirs(os.path.dirname(debug_log_path), exist_ok=True)
        with open(debug_log_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps({
                'timestamp': str(datetime.now()),
                'location': 'routes/gett.py:gett_confirm',
                'message': 'gett_confirm exception',
                'data': {
                    'error': str(e),
                    'traceback': traceback.format_exc()
                },
                'sessionId': 'debug-session',
                'runId': 'post-fix',
                'hypothesisId': 'H-confirm'
            }, ensure_ascii=False) + '\n')
            f.flush()
        return jsonify({'error': str(e)}), 500
@api.route('/gett-columns', methods=['POST'])
def get_gett_columns():
    """Get specific columns (B, D, G, H, K) from GETT file"""
    data = request.json
    filename = data.get('filename')
    
    if not filename:
        return jsonify({'error': 'Filename is required'}), 400
    
    try:
        # #region agent log
        import os, json
        from datetime import datetime
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        workspace_root = os.path.dirname(backend_dir)
        debug_log_path = os.path.join(workspace_root, '.cursor', 'debug.log')
        os.makedirs(os.path.dirname(debug_log_path), exist_ok=True)
        try:
            with open(debug_log_path, 'a', encoding='utf-8') as f:
                log_entry = {
                    'timestamp': str(datetime.now()),
                    'location': 'routes/gett.py:98',
                    'message': 'gett-columns: Starting',
                    'data': {
                        'filename': filename,
                        'GETT_HEADER_ROW': GETT_HEADER_ROW
                    },
                    'sessionId': 'debug-session',
                    'runId': 'run3',
                    'hypothesisId': 'J'
                }
                f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
                f.flush()
        except Exception:
            pass
        # #endregion
        
        # Read GETT file: read ALL rows without header first to avoid stopping at empty rows
        # Avoid nrows limit so we capture rows 16-641
        df_all = pd.read_excel(filename, header=None, engine='openpyxl')
        
        # #region agent log
        try:
            with open(debug_log_path, 'a', encoding='utf-8') as f:
                log_entry = {
                    'timestamp': str(datetime.now()),
                    'location': 'routes/gett.py:120',
                    'message': 'gett-columns: After read all rows',
                    'data': {
                        'total_row_count': len(df_all)
                    },
                    'sessionId': 'debug-session',
                    'runId': 'run3',
                    'hypothesisId': 'K'
                }
                f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
                f.flush()
        except Exception:
            pass
        # #endregion
        
        # Extract header row (row 15 in Excel = index 14 in 0-indexed)
        if len(df_all) > GETT_HEADER_ROW:
            header_row = df_all.iloc[GETT_HEADER_ROW]
            # Set header and start data from row 16 (index 15)
            df = df_all.iloc[GETT_HEADER_ROW + 1:].copy()
            df.columns = header_row
            df = df.reset_index(drop=True)
            
            # #region agent log
            try:
                with open(debug_log_path, 'a', encoding='utf-8') as f:
                    log_entry = {
                        'timestamp': str(datetime.now()),
                        'location': 'routes/gett.py:135',
                        'message': 'gett-columns: After extract header and data',
                        'data': {
                            'df_all_count': len(df_all),
                            'df_count_after_header': len(df),
                            'header_row_sample': [str(x)[:30] if x else None for x in header_row[:5]]
                        },
                        'sessionId': 'debug-session',
                        'runId': 'run3',
                        'hypothesisId': 'N'
                    }
                    f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
                    f.flush()
            except Exception:
                pass
            # #endregion
        else:
            return jsonify({'error': 'File does not contain expected header row'}), 400
        
        # #region agent log
        try:
            with open(debug_log_path, 'a', encoding='utf-8') as f:
                log_entry = {
                    'timestamp': str(datetime.now()),
                    'location': 'routes/gett.py:130',
                    'message': 'gett-columns: After skip first row',
                    'data': {
                        'row_count': len(df)
                    },
                    'sessionId': 'debug-session',
                    'runId': 'run3',
                    'hypothesisId': 'L'
                }
                f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
                f.flush()
        except Exception:
            pass
        # #endregion
        
        # For GETT, only drop rows where column D (מס' הזמנה, index 3) is NaN
        if len(df) > 0:
            col_d_name = df.columns[GETT_COLUMN_INDICES['D']] if len(df.columns) > GETT_COLUMN_INDICES['D'] else None
            if col_d_name:
                df = df[df[col_d_name].notna()].reset_index(drop=True)
            else:
                df = df.dropna(how='all')
        
        # #region agent log
        try:
            with open(debug_log_path, 'a', encoding='utf-8') as f:
                log_entry = {
                    'timestamp': str(datetime.now()),
                    'location': 'routes/gett.py:145',
                    'message': 'gett-columns: After filter column D',
                    'data': {
                        'row_count': len(df),
                        'col_d_name': col_d_name if 'col_d_name' in locals() else None
                    },
                    'sessionId': 'debug-session',
                    'runId': 'run3',
                    'hypothesisId': 'M'
                }
                f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
                f.flush()
        except Exception:
            pass
        # #endregion
        
        # Get columns by index: B=1, D=3, G=6, H=7, K=10, L=11
        column_indices = [
            GETT_COLUMN_INDICES['B'],
            GETT_COLUMN_INDICES['D'],
            GETT_COLUMN_INDICES['G'],
            GETT_COLUMN_INDICES['H'],
            GETT_COLUMN_INDICES['K'],
            GETT_COLUMN_INDICES['L']
        ]
        column_names = df.columns.tolist()
        
        # Extract data for requested columns
        result_data = []
        for idx, row in df.iterrows():
            row_data = {}
            for col_idx in column_indices:
                if col_idx < len(column_names):
                    col_name = column_names[col_idx]
                    value = row.iloc[col_idx] if col_idx < len(row) else None
                    # Convert to string, handle NaN
                    if pd.isna(value):
                        row_data[f'col_{col_idx}'] = ''
                    else:
                        row_data[f'col_{col_idx}'] = str(value)
            result_data.append(row_data)
        
        # Get column headers
        headers = {}
        for col_idx in column_indices:
            if col_idx < len(column_names):
                headers[f'col_{col_idx}'] = column_names[col_idx]
        
        return jsonify({
            'success': True,
            'headers': headers,
            'data': result_data,
            'row_count': len(result_data)
        })
    except Exception as e:
        import traceback
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

