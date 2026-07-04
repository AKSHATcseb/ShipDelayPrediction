import os
import sys
import subprocess
import time
import webbrowser
import signal

# Get the directory where the launcher is located (support PyInstaller compiled path)
if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

print("[*] Navy PMIS Standalone Launcher starting...")

# Define paths
bin_dir = os.path.join(BASE_DIR, 'bin')
db_dir = os.path.join(BASE_DIR, 'database')
mongo_data_dir = os.path.join(db_dir, 'mongo_data')
sqlite_db_dir = os.path.join(db_dir, 'sqlite_db')

# Ensure directories exist
os.makedirs(mongo_data_dir, exist_ok=True)
os.makedirs(sqlite_db_dir, exist_ok=True)

processes = []

def start_services():
    try:
        # 1. Start MongoDB
        mongod_path = os.path.join(bin_dir, 'mongod.exe')
        print(f"[*] Starting MongoDB on port 27017...")
        mongo_proc = subprocess.Popen(
            [mongod_path, '--dbpath', mongo_data_dir, '--port', '27017', '--bind_ip', '127.0.0.1'],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        processes.append(mongo_proc)
        time.sleep(2)  # Give MongoDB time to boot

        # 2. Start Node.js Backend
        node_path = os.path.join(bin_dir, 'node.exe')
        collab_backend_dir = os.path.join(bin_dir, 'collab-backend')
        server_js_path = os.path.join(collab_backend_dir, 'src', 'server.js')
        
        print(f"[*] Starting Node.js Collaboration Backend on port 5000...")
        # Run with current working directory set to collab-backend so dotenv finds its .env file
        node_proc = subprocess.Popen(
            [node_path, server_js_path],
            cwd=collab_backend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        processes.append(node_proc)

        # 3. Start Python FastAPI Backend
        run_server_path = os.path.join(bin_dir, 'run_server.exe')
        print(f"[*] Starting Python ML Backend on port 8000...")
        
        # Override database URL to use the portable database folder
        env = os.environ.copy()
        env["DATABASE_URL"] = f"sqlite:///{os.path.join(sqlite_db_dir, 'pmis.db')}"
        env["MODELS_DIR"] = os.path.join(BASE_DIR, 'models')
        env["DATA_DIR"] = os.path.join(BASE_DIR, 'data')
        env["PLOTS_DIR"] = os.path.join(BASE_DIR, 'plots')
        
        python_proc = subprocess.Popen(
            [run_server_path],
            cwd=BASE_DIR,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        processes.append(python_proc)

        # Wait for FastAPI server to initialize
        print("[*] Waiting for services to initialize...")
        time.sleep(3)

        # 4. Open default web browser
        url = "http://localhost:8000"
        print(f"[*] Launching browser at {url}...")
        webbrowser.open(url)

        print("\n=======================================================")
        print("   NAVY PMIS IS RUNNING SUCCESSFULLY!")
        print("   Close this terminal window to stop all services.")
        print("=======================================================\n")

        # Keep running and check on child processes
        while True:
            for p in processes:
                if p.poll() is not None:
                    # One of the services exited
                    print(f"[!] Warning: Process {p.args[0]} has stopped.")
            time.sleep(2)

    except KeyboardInterrupt:
        print("\n[*] Stopping all services...")
    except Exception as e:
        print(f"[!] Error starting services: {e}")
    finally:
        cleanup()

def cleanup():
    print("[*] Cleaning up background processes...")
    for p in processes:
        if p.poll() is None:
            try:
                p.terminate()
                p.wait(timeout=2)
            except Exception:
                p.kill()
    print("[*] Shutdown complete. Goodbye.")
    sys.exit(0)

# Register signals for clean exit
signal.signal(signal.SIGINT, lambda sig, frame: cleanup())
signal.signal(signal.SIGTERM, lambda sig, frame: cleanup())

if __name__ == "__main__":
    start_services()
