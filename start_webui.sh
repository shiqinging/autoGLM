2#!/bin/bash
# Open-AutoGLM Web UI Launcher

echo "========================================"
echo "  Open-AutoGLM Web UI Launcher"
echo "========================================"
echo ""

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "[INFO] Creating virtual environment..."
    python -m venv .venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Install project dependencies
echo "Installing project dependencies..."
pip install -r requirements.txt

# Install current package in editable mode
echo "Installing current package in editable mode..."
pip install -e .

echo ""
echo "Starting Web UI..."
echo "Open http://localhost:7860 in your browser"
echo ""

python webui.py --inbrowser
