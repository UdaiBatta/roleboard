@echo off
cd /d "%~dp0"
start "" "http://127.0.0.1:8766/"
"C:\Users\Udai\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m http.server 8766 --bind 127.0.0.1
