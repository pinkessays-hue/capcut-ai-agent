@echo off
chcp 65001 >nul
cd /d "%~dp0"
set PY=
py -3 --version >nul 2>&1 && set PY=py -3
if not defined PY (python --version >nul 2>&1 && set PY=python)
if not defined PY (
  echo.
  echo [실패] Python을 찾을 수 없습니다.
  echo  1^) https://www.python.org/downloads/ 에서 Python을 설치하세요.
  echo  2^) 설치 첫 화면 맨 아래 "Add python.exe to PATH" 를 꼭 체크하세요.
  echo  3^) 설치 후 이 창을 닫고 setup.bat 을 다시 실행하세요.
  echo.
  pause
  exit /b 1
)
echo 사용할 Python: %PY%
echo 처음 한 번만 설치합니다. 잠시 기다려 주세요...
%PY% -m pip install -r requirements.txt
if errorlevel 1 (
  echo.
  echo [실패] 설치 중 오류가 났습니다. 위 메시지를 알려주세요.
) else (
  echo.
  echo [완료] 설치가 끝났습니다. 이제 run.bat 을 실행하세요.
)
pause
