"""Main Flask application"""
from flask import Flask
from flask_cors import CORS
from config import UPLOAD_FOLDER, MAX_CONTENT_LENGTH, get_upload_folder
from routes import health, upload, compare, reports

# Create Flask app
app = Flask(__name__)
CORS(app)

# Configure app
app.config['UPLOAD_FOLDER'] = str(get_upload_folder())
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Register blueprints
app.register_blueprint(health.api, url_prefix='/api')
app.register_blueprint(upload.api, url_prefix='/api')
app.register_blueprint(compare.api, url_prefix='/api')
app.register_blueprint(reports.api, url_prefix='/api')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
