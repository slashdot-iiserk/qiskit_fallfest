#!/bin/bash

echo "🚀 Starting Qiskit Fall Fest 2025 Website Server"
echo "=============================================="
echo ""

# Check if Flask is installed
if ! python -c "import flask" 2>/dev/null; then
    echo "📦 Installing Flask..."
    pip install -r requirements.txt
fi

echo ""
echo "🌐 Starting Flask server..."
echo "📱 Local access: http://localhost:5000"
echo "🌍 Network access: http://[YOUR_IP_ADDRESS]:5000"
echo ""
echo "💡 To find your IP address, run:"
echo "   ip addr show | grep 'inet ' | grep -v 127.0.0.1"
echo ""
echo "🛑 Press Ctrl+C to stop the server"
echo ""

python flask_server.py