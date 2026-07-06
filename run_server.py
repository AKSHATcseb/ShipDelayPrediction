"""
run_server.py

CLI helper to start the FastAPI server.
"""

import sys
import uvicorn
from backend.config import HOST, PORT
from backend.main import app

if __name__ == "__main__":
    print(f"[*] Starting Ship Acquisition PMIS Backend on http://{HOST}:{PORT}...")
    is_frozen = getattr(sys, 'frozen', False)
    if is_frozen:
        # Under PyInstaller, reload is not supported and we pass the app object directly
        uvicorn.run(app, host=HOST, port=PORT, reload=False)
    else:
        # Development mode allows reload and accepts module path string
        uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=True)

