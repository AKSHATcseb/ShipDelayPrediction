"""
run_server.py

CLI helper to start the FastAPI server.
"""

import uvicorn
from backend.config import HOST, PORT

if __name__ == "__main__":
    print(f"[*] Starting Ship Acquisition PMIS Backend on http://{HOST}:{PORT}...")
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=True)
