#!/usr/bin/env python3
"""Quizly Application Runner

Starts both the FastAPI backend and Next.js frontend concurrently
with unified logging, health checking, and graceful shutdown handling.
The backend runs in a uv-managed virtual environment (backend/.venv).

Usage:
    python run.py                     # Start both backend & frontend
    python run.py --backend-only       # Start only FastAPI backend
    python run.py --frontend-only      # Start only Next.js frontend
    python run.py --open               # Open browser once ready
    python run.py --install            # Run `uv sync` for the backend first
    python run.py --port 8000 --frontend-port 3000
"""

from __future__ import annotations

import argparse
import os
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time
import urllib.request
import webbrowser
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"

# ANSI Colors
if sys.platform == "win32":
    # Enable ANSI escape sequences on Windows console
    os.system("")

COLOR_RESET = "\033[0m"
COLOR_BOLD = "\033[1m"
COLOR_CYAN = "\033[36m"
COLOR_GREEN = "\033[32m"
COLOR_YELLOW = "\033[33m"
COLOR_RED = "\033[31m"
COLOR_MAGENTA = "\033[35m"
COLOR_DIM = "\033[2m"


def log(tag: str, msg: str, color: str = COLOR_CYAN) -> None:
    timestamp = time.strftime("%H:%M:%S")
    print(f"{COLOR_DIM}[{timestamp}]{COLOR_RESET} {color}{COLOR_BOLD}[{tag}]{COLOR_RESET} {msg}", flush=True)


def check_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0


def load_env_files() -> None:
    """Load environment variables from root and backend .env files if present."""
    for env_path in [ROOT_DIR / ".env", BACKEND_DIR / ".env"]:
        if env_path.exists():
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip("'\"")
                    if key not in os.environ:
                        os.environ[key] = val


def get_uv_executable() -> str | None:
    """Find the uv executable used to manage the backend virtual environment."""
    return shutil.which("uv")


def get_npm_executable() -> str | None:
    """Find npm executable."""
    if sys.platform == "win32":
        npm_cmd = shutil.which("npm.cmd")
        if npm_cmd:
            return npm_cmd
    return shutil.which("npm")


def verify_prerequisites(run_backend: bool, run_frontend: bool, auto_install: bool = False) -> bool:
    """Check required dependencies and tool chains."""
    all_ok = True

    if run_backend:
        uv_bin = get_uv_executable()
        if not uv_bin:
            log("ERROR", "uv is not found in PATH! Install it from https://docs.astral.sh/uv/ to run the backend.", COLOR_RED)
            all_ok = False
        else:
            venv_dir = BACKEND_DIR / ".venv"
            if auto_install or not venv_dir.exists():
                log("SETUP", "Syncing backend virtual environment with uv...", COLOR_YELLOW)
                sync = subprocess.run([uv_bin, "sync", "--project", str(BACKEND_DIR)], check=False)
                if sync.returncode != 0:
                    log("ERROR", "uv sync failed. Please check backend dependencies.", COLOR_RED)
                    all_ok = False

            if all_ok:
                # Verify FastAPI, persistence, and all LangChain provider integrations.
                check_script = (
                    "import fastapi, uvicorn, sqlmodel, pydantic, langchain_core, langgraph, "
                    "langchain_deepseek, langchain_google_genai, langchain_huggingface, "
                    "langchain_openrouter; print('ok')"
                )
                res = subprocess.run(
                    [uv_bin, "run", "--project", str(BACKEND_DIR), "python", "-c", check_script],
                    capture_output=True,
                    text=True,
                )
                if res.returncode != 0:
                    log("WARNING", "Backend dependencies might be missing.", COLOR_YELLOW)
                    log("HINT", "Run: python run.py --install  (or: cd backend && uv sync)", COLOR_YELLOW)
                    all_ok = False

    if run_frontend:
        npm_bin = get_npm_executable()
        if not npm_bin:
            log("ERROR", "Node.js / npm is not found in PATH! Please install Node.js to run frontend.", COLOR_RED)
            all_ok = False
        else:
            node_modules = FRONTEND_DIR / "node_modules"
            next_bin = node_modules / ".bin" / ("next.cmd" if sys.platform == "win32" else "next")
            if not node_modules.exists() or not next_bin.exists():
                log("SETUP", "Frontend dependencies (node_modules) not found. Running npm install...", COLOR_YELLOW)
                install_res = subprocess.run([npm_bin, "install"], cwd=str(FRONTEND_DIR), shell=(sys.platform == "win32"))
                if install_res.returncode != 0:
                    log("ERROR", "npm install failed. Please check frontend dependencies.", COLOR_RED)
                    all_ok = False

    return all_ok


def kill_process_tree(proc: subprocess.Popen | None) -> None:
    """Ensure process and all its children are terminated cleanly."""
    if proc is None or proc.poll() is not None:
        return

    pid = proc.pid
    if sys.platform == "win32":
        try:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass
    else:
        try:
            os.killpg(os.getpgid(pid), signal.SIGTERM)
        except Exception:
            try:
                proc.terminate()
            except Exception:
                pass


def stream_pipe(proc: subprocess.Popen, tag: str, color: str, stop_event: threading.Event) -> None:
    """Stream stdout/stderr from subprocess with color-coded prefix."""
    if not proc.stdout:
        return
    try:
        for line in iter(proc.stdout.readline, b""):
            if stop_event.is_set():
                break
            if not line:
                break
            text = line.decode("utf-8", errors="replace").rstrip()
            if text:
                print(f"{color}{COLOR_BOLD}[{tag}]{COLOR_RESET} {text}", flush=True)
    except Exception:
        pass


def wait_for_ready(
    backend_url: str | None,
    frontend_url: str | None,
    open_browser: bool,
    stop_event: threading.Event,
) -> None:
    """Periodically check services and log a ready banner once active."""
    backend_ready = backend_url is None
    frontend_ready = frontend_url is None

    start_time = time.time()
    max_wait = 45  # seconds

    while not stop_event.is_set() and (time.time() - start_time < max_wait):
        if not backend_ready and backend_url:
            try:
                req = urllib.request.Request(f"{backend_url}/api/health")
                with urllib.request.urlopen(req, timeout=1) as resp:
                    if resp.status == 200:
                        backend_ready = True
            except Exception:
                pass

        if not frontend_ready and frontend_url:
            try:
                req = urllib.request.Request(frontend_url)
                with urllib.request.urlopen(req, timeout=1) as resp:
                    if resp.status in (200, 304):
                        frontend_ready = True
            except Exception:
                pass

        if backend_ready and frontend_ready:
            break

        time.sleep(1)

    if backend_ready and frontend_ready and not stop_event.is_set():
        banner = f"""
{COLOR_GREEN}{COLOR_BOLD}================================================================
                    Quizly is up and running!
================================================================{COLOR_RESET}
  {COLOR_BOLD}Frontend UI:{COLOR_RESET}    {COLOR_CYAN}{frontend_url or 'Disabled'}{COLOR_RESET}
  {COLOR_BOLD}Backend API:{COLOR_RESET}    {COLOR_CYAN}{backend_url or 'Disabled'}{COLOR_RESET}
  {COLOR_BOLD}API Docs:{COLOR_RESET}       {COLOR_CYAN}{f'{backend_url}/docs' if backend_url else 'Disabled'}{COLOR_RESET}
{COLOR_GREEN}{COLOR_BOLD}================================================================{COLOR_RESET}
  {COLOR_DIM}Press Ctrl+C at any time to stop all services.{COLOR_RESET}
"""
        print(banner, flush=True)

        if open_browser and frontend_url:
            log("INFO", f"Opening {frontend_url} in browser...", COLOR_GREEN)
            webbrowser.open(frontend_url)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Quizly Application Launcher - Run FastAPI backend and Next.js frontend."
    )
    parser.add_argument("--backend-only", action="store_true", help="Start only the FastAPI backend")
    parser.add_argument("--frontend-only", action="store_true", help="Start only the Next.js frontend")
    parser.add_argument("--port", "-p", type=int, default=8000, help="Backend port (default: 8000)")
    parser.add_argument("--frontend-port", type=int, default=3000, help="Frontend port (default: 3000)")
    parser.add_argument("--host", default="127.0.0.1", help="Backend host (default: 127.0.0.1)")
    parser.add_argument("--no-reload", action="store_true", help="Disable backend auto-reload")
    parser.add_argument("--open", action="store_true", help="Automatically open browser once ready")
    parser.add_argument("--install", action="store_true", help="Sync backend deps with uv before starting")
    args = parser.parse_args()

    run_backend = not args.frontend_only
    run_frontend = not args.backend_only

    if not run_backend and not run_frontend:
        log("ERROR", "Cannot specify both --backend-only and --frontend-only simultaneously.", COLOR_RED)
        sys.exit(1)

    load_env_files()

    print(f"\n{COLOR_CYAN}{COLOR_BOLD}Initializing Quizly Runner...{COLOR_RESET}")
    log("INFO", f"Root Directory: {ROOT_DIR}")

    # Check ports
    if run_backend and check_port_in_use(args.port, args.host):
        log("WARNING", f"Port {args.port} is already in use! The backend might fail to bind.", COLOR_YELLOW)
    if run_frontend and check_port_in_use(args.frontend_port, "127.0.0.1"):
        log("WARNING", f"Port {args.frontend_port} is already in use! Next.js may choose an alternative port.", COLOR_YELLOW)

    # Verify requirements
    if not verify_prerequisites(run_backend, run_frontend, auto_install=args.install):
        log("ERROR", "Prerequisites verification failed. Please fix the errors above.", COLOR_RED)
        sys.exit(1)

    # Prepare environment variables
    env = os.environ.copy()
    # Ensure both root and backend are on PYTHONPATH
    current_pythonpath = env.get("PYTHONPATH", "")
    new_pythonpath_parts = [str(ROOT_DIR), str(BACKEND_DIR)]
    if current_pythonpath:
        new_pythonpath_parts.append(current_pythonpath)
    env["PYTHONPATH"] = os.pathsep.join(new_pythonpath_parts)

    backend_proc: subprocess.Popen | None = None
    frontend_proc: subprocess.Popen | None = None
    stop_event = threading.Event()
    threads: list[threading.Thread] = []

    # 1. Start Backend
    if run_backend:
        uv_bin = get_uv_executable() or "uv"
        backend_cmd = [
            uv_bin,
            "run",
            "--project",
            str(BACKEND_DIR),
            "uvicorn",
            "app.main:app",
            "--host",
            args.host,
            "--port",
            str(args.port),
        ]
        if not args.no_reload:
            backend_cmd.append("--reload")

        log("START", f"Starting FastAPI backend on http://{args.host}:{args.port}...", COLOR_CYAN)
        backend_proc = subprocess.Popen(
            backend_cmd,
            cwd=str(BACKEND_DIR),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        t_b = threading.Thread(
            target=stream_pipe,
            args=(backend_proc, "backend", COLOR_CYAN, stop_event),
            daemon=True,
        )
        t_b.start()
        threads.append(t_b)

    # 2. Start Frontend
    if run_frontend:
        npm_bin = get_npm_executable() or "npm"
        frontend_env = env.copy()
        frontend_env["PORT"] = str(args.frontend_port)
        frontend_env["NEXT_PUBLIC_API_BASE_URL"] = f"http://{args.host}:{args.port}"

        frontend_cmd = [npm_bin, "run", "dev", "--", "-p", str(args.frontend_port)]
        log("START", f"Starting Next.js frontend on http://localhost:{args.frontend_port}...", COLOR_MAGENTA)
        frontend_proc = subprocess.Popen(
            frontend_cmd,
            cwd=str(FRONTEND_DIR),
            env=frontend_env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            shell=(sys.platform == "win32"),
        )
        t_f = threading.Thread(
            target=stream_pipe,
            args=(frontend_proc, "frontend", COLOR_MAGENTA, stop_event),
            daemon=True,
        )
        t_f.start()
        threads.append(t_f)

    # 3. Health check & Ready banner
    backend_url = f"http://{args.host}:{args.port}" if run_backend else None
    frontend_url = f"http://localhost:{args.frontend_port}" if run_frontend else None

    ready_thread = threading.Thread(
        target=wait_for_ready,
        args=(backend_url, frontend_url, args.open, stop_event),
        daemon=True,
    )
    ready_thread.start()

    # 4. Monitor loop and graceful shutdown
    try:
        while True:
            time.sleep(0.5)
            # Check if any process unexpectedly died
            if backend_proc and backend_proc.poll() is not None:
                log("EXIT", f"Backend process exited unexpectedly with code {backend_proc.returncode}.", COLOR_RED)
                break
            if frontend_proc and frontend_proc.poll() is not None:
                log("EXIT", f"Frontend process exited unexpectedly with code {frontend_proc.returncode}.", COLOR_RED)
                break
    except KeyboardInterrupt:
        print("\n", flush=True)
        log("STOP", "Received shutdown signal (Ctrl+C). Terminating services...", COLOR_YELLOW)
    finally:
        stop_event.set()
        if backend_proc:
            log("STOP", "Stopping Backend...", COLOR_DIM)
            kill_process_tree(backend_proc)
        if frontend_proc:
            log("STOP", "Stopping Frontend...", COLOR_DIM)
            kill_process_tree(frontend_proc)
        log("STOP", "All Quizly processes stopped. Goodbye!", COLOR_GREEN)


if __name__ == "__main__":
    main()
