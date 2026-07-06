import os
import sys
import subprocess
import threading
import time
import webbrowser
import signal

# ANSI Escape Codes for colored terminal logs
COLOR_PYTHON = "\033[94m"  # Blue
COLOR_NODE = "\033[92m"    # Green
COLOR_VITE = "\033[96m"    # Cyan
COLOR_RESET = "\033[0m"
COLOR_BOLD = "\033[1m"
COLOR_RED = "\033[91m"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

print(f"{COLOR_BOLD}[*] Starting Navy PMIS Orchestrator...{COLOR_RESET}")

processes = []
threads = []
shutting_down = False

def log_stream(proc, prefix, color):
    """Read lines from process.stdout and print them with a colored prefix."""
    global shutting_down
    try:
        # Read stdout line by line
        for line in iter(proc.stdout.readline, ''):
            if shutting_down:
                break
            if line:
                sys.stdout.write(f"{color}{prefix}{COLOR_RESET} {line}")
                sys.stdout.flush()
    except Exception as e:
        if not shutting_down:
            print(f"{COLOR_RED}[!] Error reading output from {prefix}: {e}{COLOR_RESET}")

def run_service(command, cwd, prefix, color, shell=False):
    """Start a service in the background and spawn a thread to log its output."""
    try:
        proc = subprocess.Popen(
            command,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            shell=shell
        )
        processes.append((proc, prefix))
        
        # Spawn daemon logging thread
        t = threading.Thread(target=log_stream, args=(proc, prefix, color), daemon=True)
        t.start()
        threads.append(t)
        return proc
    except Exception as e:
        print(f"{COLOR_RED}[!] Failed to start {prefix}: {e}{COLOR_RESET}")
        cleanup_and_exit()

def kill_process_tree(proc, name):
    """Gracefully terminate or force kill a process and its children."""
    pid = proc.pid
    if sys.platform == 'win32':
        # On Windows, taskkill /F /T kills the process and all its children.
        # This is critical for shell=True (npm run dev) since cmd.exe spawns child node processes.
        try:
            subprocess.run(
                ['taskkill', '/F', '/T', '/PID', str(pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
        except Exception as e:
            print(f"[!] taskkill failed for {name} (PID {pid}): {e}")
    else:
        # Unix/Linux/macOS graceful shutdown
        try:
            os.killpg(os.getpgid(pid), signal.SIGTERM)
        except Exception:
            try:
                proc.terminate()
                proc.wait(timeout=2)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass

def cleanup_and_exit(signum=None, frame=None):
    """Gracefully terminate all running services and exit."""
    global shutting_down
    if shutting_down:
        return
    shutting_down = True
    
    print(f"\n{COLOR_BOLD}[*] Shutting down all services...{COLOR_RESET}")
    for proc, name in processes:
        if proc.poll() is None:
            print(f"[*] Stopping {name} (PID {proc.pid})...")
            kill_process_tree(proc, name)
            
    print(f"{COLOR_BOLD}[*] Shutdown complete. Exiting.{COLOR_RESET}")
    sys.exit(0)

# Register interrupt signals
signal.signal(signal.SIGINT, cleanup_and_exit)
signal.signal(signal.SIGTERM, cleanup_and_exit)

def main():
    # 1. Start Python FastAPI backend
    python_cmd = [sys.executable, "-u", "run_server.py"]
    print(f"[*] Launching FastAPI Backend on port 8000...")
    run_service(python_cmd, BASE_DIR, "[Python-API]", COLOR_PYTHON, shell=False)

    # 2. Start Node Collaboration backend
    collab_dir = os.path.join(BASE_DIR, "collab-backend")
    print(f"[*] Launching Node.js Collaboration Backend on port 5000...")
    run_service("npm run dev", collab_dir, "[Node-Collab]", COLOR_NODE, shell=True)

    # 3. Start React/Vite Frontend
    frontend_dir = os.path.join(BASE_DIR, "frontend")
    print(f"[*] Launching Vite Frontend on port 3000...")
    run_service("npm run dev", frontend_dir, "[Vite-Front]", COLOR_VITE, shell=True)

    # 4. Wait a bit, then launch the browser
    time.sleep(4)
    url = "http://localhost:3000"
    print(f"\n{COLOR_BOLD}[*] Launching web browser at {url}...{COLOR_RESET}\n")
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"[!] Could not open browser: {e}")

    # Keep main thread alive and monitor processes
    try:
        while True:
            dead_services = []
            for proc, name in processes:
                exit_code = proc.poll()
                if exit_code is not None:
                    dead_services.append((name, exit_code))
            
            if dead_services:
                for name, code in dead_services:
                    print(f"{COLOR_RED}[!] Service {name} exited unexpectedly with code {code}{COLOR_RESET}")
                cleanup_and_exit()
                
            time.sleep(1)
    except KeyboardInterrupt:
        cleanup_and_exit()

if __name__ == "__main__":
    main()
