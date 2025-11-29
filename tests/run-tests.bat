@echo off
echo 🚀 Lancement des Tests de Santé SchoolReg
echo ========================================

cd /d "%~dp0"

echo 📦 Installation des dépendances...
call npm install

echo.
echo 🧪 Exécution des tests de santé...
echo.
node api-test-runner.js

echo.
echo 📊 Tests terminés. Consultez le rapport généré.
pause
