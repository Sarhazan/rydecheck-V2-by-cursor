"""Report generation endpoints"""
import os
from flask import request, jsonify, send_file
from report_generator import ReportGenerator
from email_sender import EmailSender
from flask import Blueprint

api = Blueprint('reports', __name__)

@api.route('/reports/departments', methods=['POST'])
def get_department_summary():
    """Get department cost summary"""
    data = request.json
    department_allocations = data.get('department_allocations')
    
    if not department_allocations:
        return jsonify({'error': 'Department allocations not provided'}), 400
    
    # Extract summary
    dept_summary = {}
    dept_allocs = department_allocations.get('department_allocations', {})
    
    for dept_name, dept_data in dept_allocs.items():
        avg_cost = dept_data['total_cost'] / dept_data['ride_count'] if dept_data['ride_count'] > 0 else 0
        dept_summary[dept_name] = {
            'total_cost': dept_data['total_cost'],
            'ride_count': dept_data['ride_count'],
            'average_cost': round(avg_cost, 2)
        }
    
    unassigned = department_allocations.get('unassigned', {})
    
    return jsonify({
        'success': True,
        'departments': dept_summary,
        'unassigned': {
            'total_cost': unassigned.get('total_cost', 0),
            'ride_count': unassigned.get('ride_count', 0)
        }
    })

@api.route('/reports/departments/<path:dept_name>/excel', methods=['POST'])
def generate_department_excel(dept_name):
    """Generate and download Excel report for a department"""
    data = request.json
    department_allocations = data.get('department_allocations')
    
    if not department_allocations:
        return jsonify({'error': 'Department allocations not provided'}), 400
    
    dept_allocs = department_allocations.get('department_allocations', {})
    
    if dept_name not in dept_allocs:
        return jsonify({'error': f'Department {dept_name} not found'}), 404
    
    try:
        generator = ReportGenerator()
        report_path = generator.generate_department_report(
            department_name=dept_name,
            department_data=dept_allocs[dept_name]
        )
        
        return send_file(
            report_path,
            as_attachment=True,
            download_name=f'department_report_{dept_name}.xlsx',
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except Exception as e:
        import traceback
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

@api.route('/reports/send-email', methods=['POST'])
def send_department_email():
    """Send department report via email"""
    data = request.json
    
    recipient_email = data.get('recipient_email')
    department_name = data.get('department_name')
    department_allocations = data.get('department_allocations')
    sender_email = data.get('sender_email')
    sender_password = data.get('sender_password')
    smtp_server = data.get('smtp_server', 'smtp.gmail.com')
    smtp_port = data.get('smtp_port', 587)
    
    if not all([recipient_email, department_name, department_allocations, sender_email, sender_password]):
        return jsonify({'error': 'Missing required parameters'}), 400
    
    try:
        # Generate report first
        dept_allocs = department_allocations.get('department_allocations', {})
        if department_name not in dept_allocs:
            return jsonify({'error': f'Department {department_name} not found'}), 404
        
        generator = ReportGenerator()
        report_path = generator.generate_department_report(
            department_name=department_name,
            department_data=dept_allocs[department_name]
        )
        
        # Send email
        email_sender = EmailSender(smtp_server=smtp_server, smtp_port=smtp_port)
        success = email_sender.send_department_report(
            recipient_email=recipient_email,
            department_name=department_name,
            report_file_path=report_path,
            sender_email=sender_email,
            sender_password=sender_password
        )
        
        # Clean up temp file
        try:
            os.remove(report_path)
        except:
            pass
        
        if success:
            return jsonify({'success': True, 'message': 'Email sent successfully'})
        else:
            return jsonify({'error': 'Failed to send email'}), 500
    
    except Exception as e:
        import traceback
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

