import os
import shutil
import subprocess
import sys

# Define base paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, 'Navy-PMIS-Distribution')

def run_cmd(cmd, cwd=None):
    print(f"[*] Running: {cmd} in {cwd or 'root'}")
    res = subprocess.run(cmd, shell=True, cwd=cwd)
    if res.returncode != 0:
        print(f"[!] Error running command: {cmd}")
        sys.exit(1)

def main():
    print("[*] Starting Navy PMIS Packaging pipeline...")

    # 1. Build frontend React assets
    frontend_dir = os.path.join(BASE_DIR, 'frontend')
    run_cmd("npm run build", cwd=frontend_dir)

    # 2. Copy frontend assets to backend/static (for dev consistency)
    static_dev_dir = os.path.join(BASE_DIR, 'backend', 'static')
    shutil.rmtree(static_dev_dir, ignore_errors=True)
    os.makedirs(static_dev_dir, exist_ok=True)
    shutil.copytree(os.path.join(frontend_dir, 'dist'), static_dev_dir, dirs_exist_ok=True)
    print("[*] Copied frontend build to backend dev static folder.")

    # 3. Compile Python server with PyInstaller
    print("[*] Compiling Python server...")
    pyinstaller_bin = os.path.join(BASE_DIR, '.venv', 'Scripts', 'pyinstaller.exe')
    
    # We build run_server.py as a directory (--onedir) so we can place other binaries beside it easily
    run_cmd(f'"{pyinstaller_bin}" --onedir --noconfirm --clean --name run_server --distpath dist run_server.py', cwd=BASE_DIR)

    # 4. Compile Launcher script with PyInstaller
    print("[*] Compiling launcher...")
    run_cmd(f'"{pyinstaller_bin}" --onefile --noconfirm --clean --name Launch-PMIS --distpath dist_launcher launcher.py', cwd=BASE_DIR)

    # 5. Assemble Distribution Folder
    print("[*] Assembling distribution folder...")
    shutil.rmtree(DIST_DIR, ignore_errors=True)
    os.makedirs(DIST_DIR, exist_ok=True)

    # Create directories
    bin_target = os.path.join(DIST_DIR, 'bin')
    static_target = os.path.join(bin_target, 'static')
    collab_target = os.path.join(bin_target, 'collab-backend')
    database_target = os.path.join(DIST_DIR, 'database')
    models_target = os.path.join(DIST_DIR, 'models')
    data_target = os.path.join(DIST_DIR, 'data')
    plots_target = os.path.join(DIST_DIR, 'plots')

    os.makedirs(bin_target, exist_ok=True)
    os.makedirs(database_target, exist_ok=True)
    os.makedirs(models_target, exist_ok=True)
    os.makedirs(data_target, exist_ok=True)
    os.makedirs(plots_target, exist_ok=True)

    # A. Copy compiled Python server files
    print("[*] Copying python server binary files...")
    shutil.copytree(os.path.join(BASE_DIR, 'dist', 'run_server'), bin_target, dirs_exist_ok=True)

    # B. Copy compiled Launcher executable to the distribution root
    print("[*] Copying Launch-PMIS.exe launcher...")
    shutil.copy2(os.path.join(BASE_DIR, 'dist_launcher', 'Launch-PMIS.exe'), os.path.join(DIST_DIR, 'Launch-PMIS.exe'))

    # C. Copy Node.exe binary
    node_source = r"C:\nodejs\node.exe"
    print(f"[*] Copying Node.exe from {node_source}...")
    shutil.copy2(node_source, os.path.join(bin_target, 'node.exe'))

    # D. Copy Mongod.exe binary
    mongod_source = r"C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe"
    print(f"[*] Copying Mongod.exe from {mongod_source}...")
    shutil.copy2(mongod_source, os.path.join(bin_target, 'mongod.exe'))

    # E. Copy Collab Backend codebase (excluding node_modules/dev folders, then copy required files)
    print("[*] Copying Collab Backend codebase...")
    shutil.copytree(
        os.path.join(BASE_DIR, 'collab-backend'), 
        collab_target, 
        ignore=shutil.ignore_patterns('.git', 'src/test_pkg.exe', 'src/inspect_mongo.js', 'src/inspect_oplog.js', 'src/delete_target_projects.js', 'src/migrateSqliteJson.js.backup'),
        dirs_exist_ok=True
    )

    # F. Copy built static frontend files to static/ folder next to run_server.exe
    print("[*] Copying frontend static pages...")
    shutil.copytree(os.path.join(frontend_dir, 'dist'), static_target, dirs_exist_ok=True)

    # G. Copy models
    print("[*] Copying trained ML models...")
    shutil.copytree(os.path.join(BASE_DIR, 'models'), models_target, dirs_exist_ok=True)

    # H. Copy data & plots
    print("[*] Copying data and plots...")
    shutil.copytree(os.path.join(BASE_DIR, 'data'), data_target, dirs_exist_ok=True)
    shutil.copytree(os.path.join(BASE_DIR, 'plots'), plots_target, dirs_exist_ok=True)

    print("\n=======================================================")
    print("   BUILD COMPLETE!")
    print(f"   Distributable folder built at: {DIST_DIR}")
    print("   You can zip this folder and share it with anyone!")
    print("=======================================================\n")

if __name__ == "__main__":
    main()
