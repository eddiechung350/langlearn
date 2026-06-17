#!/bin/bash
# LangLearn Backend Startup Script

cd /opt/data/workspace/langlearn/backend

# Install dependencies if needed
pip install -q -r requirements.txt 2>/dev/null

# Seed database with Japanese phrases (run once)
echo "Seeding database..."
curl -s -X POST http://localhost:5000/api/seed

echo ""
echo "Starting LangLearn API server..."
echo "API: http://localhost:5000/api"
echo "Health: http://localhost:5000/api/health"
echo ""

python3 app.py
