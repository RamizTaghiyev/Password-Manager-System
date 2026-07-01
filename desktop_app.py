"""
Desktop launcher for the Password Manager.

This does not change any UI, styling, or backend logic. It runs the exact
same Flask app (main.py) that already serves templates/index.html and
static/, and simply opens it inside a native desktop window instead of a
browser tab. Drop this file into the project root, next to main.py.

Usage:
    pip install -r requirements-desktop.txt
    python desktop_app.py
"""

import socket
import sys
import threading
import time

import webview

from main import (
    app,
    setup_database,
    setup_vault_table,
    setup_server_password_change_request_table,
)

HOST = "127.0.0.1"
PORT = 5000
APP_TITLE = "Password Manager"

# Matches --dark-bg in static/style.css so the window doesn't flash white
# before the page finishes loading.
WINDOW_BACKGROUND = "#050b18"


def _port_is_open(host: str, port: int, timeout: float = 0.5) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(timeout)
        try:
            sock.connect((host, port))
            return True
        except OSError:
            return False


def _run_backend() -> None:
    setup_database()
    setup_vault_table()
    setup_server_password_change_request_table()

    # debug/reloader are off here on purpose: the reloader spawns a second
    # process, which is not what you want once this is wrapped in a
    # desktop window (or later packaged with PyInstaller).
    app.run(host=HOST, port=PORT, debug=False, use_reloader=False, threaded=True)


def _wait_for_backend(host: str, port: int, timeout: float = 10.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if _port_is_open(host, port):
            return True
        time.sleep(0.15)
    return False


def launch() -> None:
    server_thread = threading.Thread(target=_run_backend, daemon=True)
    server_thread.start()

    if not _wait_for_backend(HOST, PORT):
        print("Backend did not start in time.", file=sys.stderr)
        sys.exit(1)

    webview.create_window(
        APP_TITLE,
        url=f"http://{HOST}:{PORT}/",
        width=1200,
        height=800,
        min_size=(960, 640),
        background_color=WINDOW_BACKGROUND,
    )
    webview.start()


if __name__ == "__main__":
    launch()
