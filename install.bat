@echo off
echo Installing dependencies...
"E:\Program Files\nodejs\node.exe" "E:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" install
echo Installation complete!
echo Starting development server...
"E:\Program Files\nodejs\node.exe" "E:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run dev
pause