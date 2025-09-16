# Qiskit Fall Fest 2025 Website - Flask Deployment

This repository contains the Qiskit Fall Fest 2025 website with Flask deployment for local intranet access.

## 🚀 Quick Start

### Option 1: Using the Run Script (Recommended)
```bash
./run_server.sh
```

### Option 2: Manual Setup
1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the Flask server:
```bash
python flask_server.py
```

## 🌐 Access the Website

### Local Access (on your machine)
- Open your browser and go to: `http://localhost:5000`

### Network Access (from other devices)
1. Find your computer's IP address:
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

2. Access from other devices using: `http://[YOUR_IP_ADDRESS]:5000`

## 📁 Project Structure

```
qiskit_iiserk/
├── index.html          # Main website file
├── styles.css          # Website styles
├── script.js           # JavaScript functionality
├── flask_server.py    # Flask application
├── requirements.txt    # Python dependencies
├── run_server.sh      # Easy startup script
├── assets/             # Images and media files
│   ├── profile_img/    # Team member profile images
│   └── Emojis/         # Website graphics
└── Fall Fest Graphics/ # Additional graphics
```

## 🛠️ Features

- ✅ Static file serving for all website assets
- ✅ Accessible on local network (intranet)
- ✅ Automatic dependency installation
- ✅ Debug mode enabled for development
- ✅ Easy startup with single command

## 🛑 Stopping the Server

Press `Ctrl+C` in the terminal where the server is running to stop it.

## 📝 Requirements

- Python 3.7+
- Internet connection (for initial Flask installation)

## 🎯 Use Cases

- Local development and testing
- Intranet deployment for team access
- Demo presentations on local network
- Offline website hosting

---

**Happy coding! 🚀**