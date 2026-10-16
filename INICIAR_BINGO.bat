@echo off
setlocal EnableExtensions
title Iniciando BINGO

set "BINGO_ROOT=%~dp0"
set "CLIENT_DIR=%BINGO_ROOT%cliente"
set "SERVER_DIR=%BINGO_ROOT%servidor"
set "APP_URL=http://localhost:5173"
set "XAMPP_DIR=C:\xampp"

color 0B
echo.
echo  ============================================================
echo                    BINGO ASODIFI
echo      Instalacion automatica e inicio de todos los servicios
echo  ============================================================
echo.

if not exist "%SERVER_DIR%\package.json" goto :invalid_project
if not exist "%CLIENT_DIR%\package.json" goto :invalid_project

rem ---------------------------------------------------------------
rem  1. Node.js
rem ---------------------------------------------------------------
call :refresh_node_path
where node.exe >nul 2>&1
if errorlevel 1 (
  echo  [1/6] Node.js no esta instalado. Instalando con winget...
  call :need_winget
  if errorlevel 1 goto :node_error
  winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
  call :refresh_node_path
  where node.exe >nul 2>&1
  if errorlevel 1 goto :node_error
) else (
  echo  [1/6] Node.js listo.
)
where npm.cmd >nul 2>&1
if errorlevel 1 goto :npm_error

if /I "%~1"=="--check" (
  echo  [OK] El lanzador y las rutas del proyecto son validos.
  exit /b 0
)

rem ---------------------------------------------------------------
rem  2. Dependencias de npm
rem ---------------------------------------------------------------
if not exist "%SERVER_DIR%\node_modules\mysql2\package.json" (
  echo  [2/6] Instalando dependencias del servidor...
  call :npm_install "%SERVER_DIR%" "%SERVER_DIR%\node_modules\mysql2\package.json"
  if errorlevel 1 goto :install_error
) else (
  echo  [2/6] Dependencias del servidor listas.
)

if not exist "%CLIENT_DIR%\node_modules\vite\package.json" (
  echo  [3/6] Instalando dependencias del cliente ^(puede tardar unos minutos^)...
  call :npm_install "%CLIENT_DIR%" "%CLIENT_DIR%\node_modules\vite\package.json"
  if errorlevel 1 goto :install_error
) else (
  echo  [3/6] Dependencias del cliente listas.
)

rem ---------------------------------------------------------------
rem  4. MySQL / MariaDB (XAMPP)
rem ---------------------------------------------------------------
call :port_open 3306
if errorlevel 1 (
  if not exist "%XAMPP_DIR%\mysql\bin\mysqld.exe" (
    echo  [4/6] MySQL no esta instalado. Instalando XAMPP con winget ^(puede tardar varios minutos^)...
    call :need_winget
    if errorlevel 1 goto :mysql_error
    winget install -e --id ApacheFriends.Xampp.8.2 --silent --accept-package-agreements --accept-source-agreements
  )
  if exist "%XAMPP_DIR%\mysql\bin\mysqld.exe" (
    echo         Iniciando MySQL...
    start "BINGO - MySQL" /MIN /D "%XAMPP_DIR%\mysql\bin" "%XAMPP_DIR%\mysql\bin\mysqld.exe" --defaults-file="%XAMPP_DIR%\mysql\bin\my.ini" --standalone
    call :wait_port 3306 40
  )
)
call :port_open 3306
if errorlevel 1 goto :mysql_error
echo  [4/6] MySQL disponible.

rem ---------------------------------------------------------------
rem  5. Base de datos (solo se importa si aun no existe)
rem ---------------------------------------------------------------
pushd "%SERVER_DIR%"
node setup-db.js
set "DB_RESULT=%errorlevel%"
popd
if not "%DB_RESULT%"=="0" goto :db_error
echo  [5/6] Base de datos lista.

rem ---------------------------------------------------------------
rem  6. Servidor e interfaz
rem ---------------------------------------------------------------
call :port_open 3000
if errorlevel 1 (
  echo  [6/6] Abriendo servidor en el puerto 3000...
  start "BINGO - Servidor" /D "%SERVER_DIR%" cmd.exe /k "npm.cmd run dev"
) else (
  echo  [6/6] El servidor ya esta activo en el puerto 3000.
)

call :port_open 5173
if errorlevel 1 (
  echo         Abriendo interfaz en el puerto 5173...
  start "BINGO - Interfaz" /D "%CLIENT_DIR%" cmd.exe /k "npm.cmd run dev -- --host 0.0.0.0"
) else (
  echo         La interfaz ya esta activa en el puerto 5173.
)

echo.
echo  Esperando a que la aplicacion este lista...
powershell.exe -NoProfile -Command "$limit=(Get-Date).AddSeconds(90); do { try { $r=Invoke-WebRequest -UseBasicParsing '%APP_URL%' -TimeoutSec 2; if ($r.StatusCode -ge 200) { exit 0 } } catch {}; Start-Sleep -Milliseconds 700 } while ((Get-Date) -lt $limit); exit 1" >nul 2>&1
if errorlevel 1 goto :startup_error

color 0A
echo.
echo  ============================================================
echo   BINGO esta listo
echo   Administrador: %APP_URL%   (usuario: admin / clave: admin123)
echo   Overlay OBS:   %APP_URL%/obs
echo  ============================================================
echo.

if /I "%~1"=="--no-browser" exit /b 0
start "" "%APP_URL%"
timeout /t 3 /nobreak >nul
exit /b 0

rem ---------------------------------------------------------------
rem  npm install dentro de la carpeta, con un reintento. El segundo argumento es
rem  un archivo que debe existir al terminar; si no, la instalacion fallo.
:npm_install
pushd "%~1"
call npm.cmd install --no-audit --no-fund
if not exist "%~2" (
  echo  La instalacion fallo. Verificando cache de npm y reintentando...
  call npm.cmd cache verify >nul 2>&1
  call npm.cmd install --no-audit --no-fund
)
popd
if not exist "%~2" exit /b 1
exit /b 0

:port_open
powershell.exe -NoProfile -Command "$c=New-Object Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', %~1); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
exit /b %errorlevel%

:wait_port
powershell.exe -NoProfile -Command "$limit=(Get-Date).AddSeconds(%~2); do { $c=New-Object Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', %~1); $c.Close(); exit 0 } catch {}; Start-Sleep -Milliseconds 700 } while ((Get-Date) -lt $limit); exit 1" >nul 2>&1
exit /b %errorlevel%

:need_winget
where winget.exe >nul 2>&1
exit /b %errorlevel%

:refresh_node_path
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
exit /b 0

:node_error
color 0C
echo  [ERROR] No fue posible instalar Node.js automaticamente.
echo  Instalalo desde https://nodejs.org ^(version LTS^) y vuelve a ejecutar este archivo.
goto :fatal_end

:npm_error
color 0C
echo  [ERROR] npm no esta disponible en el PATH.
echo  Reinstala Node.js activando la opcion Add to PATH.
goto :fatal_end

:mysql_error
color 0C
echo.
echo  [ERROR] MySQL no esta disponible en el puerto 3306.
echo  Instala XAMPP desde https://www.apachefriends.org, inicia MySQL
echo  ^(usuario root, sin clave^) y vuelve a ejecutar este archivo.
goto :fatal_end

:db_error
color 0C
echo  [ERROR] No fue posible preparar la base de datos. Revisa el mensaje anterior.
goto :fatal_end

:invalid_project
color 0C
echo  [ERROR] INICIAR_BINGO.bat debe permanecer en la carpeta raiz de BINGO.
goto :fatal_end

:install_error
color 0C
echo  [ERROR] No fue posible instalar las dependencias.
echo  Revisa tu conexion a Internet y vuelve a intentarlo.
goto :fatal_end

:startup_error
color 0E
echo.
echo  [AVISO] La interfaz tardo mas de lo esperado en responder.
echo  Revisa las ventanas BINGO - Servidor y BINGO - Interfaz.
goto :fatal_end

:fatal_end
echo.
pause
exit /b 1
