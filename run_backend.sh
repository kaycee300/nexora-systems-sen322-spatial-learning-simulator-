#!/bin/bash
# SkillScape Backend Startup Script
# This script runs the FastAPI backend from the correct directory

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to the project root directory
cd "$SCRIPT_DIR"

# Set the port (default 8084, can be overridden)
PORT=${PORT:-8084}

echo "Starting SkillScape API on port $PORT..."
echo "Project root: $SCRIPT_DIR"

# Run uvicorn from the project root, specifying backend.main as the app
uvicorn backend.main:app --reload --port "$PORT" --host 0.0.0.0