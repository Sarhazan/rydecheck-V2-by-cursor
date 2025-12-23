"""File upload endpoints"""
import os
import shutil
from flask import request, jsonify
from werkzeug.utils import secure_filename
from file_parser import FileParser
from config import get_upload_folder, get_workspace_root
from utils import allowed_file
from flask import Blueprint

api = Blueprint('upload', __name__)

@api.route('/upload', methods=['POST'])
def upload_file():
    """Upload a file"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    file_type = request.form.get('type')  # 'company', 'supplier1', 'supplier2', 'supplier3', 'employee'
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Add type prefix to avoid conflicts
        if file_type:
            name, ext = os.path.splitext(filename)
            filename = f"{file_type}_{name}{ext}"
        
        upload_folder = get_upload_folder()
        filepath = upload_folder / filename
        file.save(str(filepath))
        
        # Parse the file
        parser = FileParser()
        try:
            data = parser.parse_file(str(filepath), file_type)
            
            # Clean column names to avoid NaN in JSON (invalid in browser)
            columns = []
            if data:
                raw_cols = list(data[0].keys())
                for c in raw_cols:
                    try:
                        if c is None:
                            columns.append("")
                        elif isinstance(c, float):
                            # Handle NaN/float column names
                            if getattr(c, "is_integer", lambda: False)() and not getattr(c, "is_nan", lambda: False)():
                                columns.append(str(int(c)))
                            else:
                                if c != c:  # NaN check
                                    columns.append("")
                                else:
                                    columns.append(str(c))
                        else:
                            columns.append(str(c))
                    except Exception:
                        columns.append(str(c) if c is not None else "")
            else:
                columns = []
            
            return jsonify({
                'success': True,
                'filename': str(filepath),  # Return full path for comparison
                'rows': len(data),
                'columns': columns
            })
        except Exception as e:
            import traceback
            return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500
    
    return jsonify({'error': 'Invalid file type'}), 400

@api.route('/load-demo-data', methods=['POST'])
def load_demo_data():
    """Load demo data files from root directory"""
    try:
        root_dir = get_workspace_root()
        upload_folder = get_upload_folder()
        
        demo_files = {
            'company': 'קובץ רייד 1125.csv',
            'supplier1': 'בון תור 1125.xlsx',
            'supplier2': 'דוח גט 1125.xlsx',
            'supplier3': 'חורי 1125.xlsx',
            'employee': 'מסד עובדים.csv'
        }
        
        loaded_files = {}
        
        for file_type, filename in demo_files.items():
            source_path = root_dir / filename
            if source_path.exists():
                # Copy to uploads folder with type prefix
                name, ext = os.path.splitext(filename)
                dest_filename = f"{file_type}_{name}{ext}"
                dest_path = upload_folder / dest_filename
                
                shutil.copy2(str(source_path), str(dest_path))
                loaded_files[file_type] = str(dest_path)
            else:
                # Try alternative path in uploads folder
                alt_path = upload_folder / filename
                if alt_path.exists():
                    name, ext = os.path.splitext(filename)
                    dest_filename = f"{file_type}_{name}{ext}"
                    dest_path = upload_folder / dest_filename
                    if not dest_path.exists():
                        shutil.copy2(str(alt_path), str(dest_path))
                    loaded_files[file_type] = str(dest_path)
        
        return jsonify({
            'success': True,
            'message': f'נטענו {len(loaded_files)} קבצים',
            'files': loaded_files
        })
    except Exception as e:
        import traceback
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

@api.route('/clear-demo-data', methods=['POST'])
def clear_demo_data():
    """Clear uploaded demo data files"""
    try:
        cleared_count = 0
        upload_folder = get_upload_folder()
        
        for filepath in upload_folder.iterdir():
            if filepath.is_file():
                try:
                    filepath.unlink()
                    cleared_count += 1
                except Exception as e:
                    print(f"Error removing {filepath.name}: {e}")
        
        return jsonify({
            'success': True,
            'message': f'נוקו {cleared_count} קבצים',
            'cleared_count': cleared_count
        })
    except Exception as e:
        import traceback
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

