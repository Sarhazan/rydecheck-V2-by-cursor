"""Health check endpoint"""
from flask import jsonify, Blueprint

api = Blueprint('health', __name__)

@api.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok'})

