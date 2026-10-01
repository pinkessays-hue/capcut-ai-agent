@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 처음 한 번만 설치합니다. 잠시 기다려 주세요...
python -m pip install -r requirements.txt
if errorlevel 1 (echo.
echo 실패: Python이 설치되어 있는지 확인하세요 https://www.python.org/downloads/ ^(설치 시 "Add Python to PATH" 체크^))
pause
