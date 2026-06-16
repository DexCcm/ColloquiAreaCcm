@echo off
REM ============================================================
REM  ColloquiTeam - Avvia server HTTP locale per test
REM ============================================================
REM  Doppio click su questo file: serve la cartella su
REM  http://localhost:8000 e apre il browser.
REM  Funziona con qualsiasi Python 3 installato (default su Win10/11).
REM ============================================================
cd /d "%~dp0"
start "" http://localhost:8000/
python -m http.server 8000
pause
