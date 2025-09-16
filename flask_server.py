from flask import Flask, send_from_directory, render_template
import os

app = Flask(__name__)

# Path to the website directory
WEBSITE_DIR = os.path.dirname(os.path.abspath(__file__))

@app.route('/')
def index():
    """Serve the main index.html file"""
    return send_from_directory(WEBSITE_DIR, 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve all other static files (CSS, JS, images, etc.)"""
    return send_from_directory(WEBSITE_DIR, filename)

if __name__ == '__main__':
    print("🚀 Starting Flask server for Qiskit Fall Fest 2025 website...")
    print("📱 Local access: http://localhost:5000")
    print("🌐 Network access: http://[YOUR_IP_ADDRESS]:5000")
    print("💡 To find your IP address, run: ip addr show | grep 'inet ' | grep -v 127.0.0.1")

    # Run on all interfaces (0.0.0.0) so it's accessible from other devices on the network
    app.run(host='0.0.0.0', port=5000, debug=True)