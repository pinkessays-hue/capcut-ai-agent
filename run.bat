@echo off
chcp 65001 >nul
cd /d "%~dp0"
set PY=
py -3 --version >nul 2>&1 && set PY=py -3
if not defined PY (python --version >nul 2>&1 && set PY=python)
if not defined PY (
  echo [실패] Python을 찾을 수 없습니다. 먼저 setup.bat 안내를 확인하세요.
  pause
  exit /b 1
)
if "%~1"=="" (%PY% run.py) else (%PY% run.py %*)
pause
