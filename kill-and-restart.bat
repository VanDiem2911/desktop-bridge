@echo off
title Restart DUDI Bridge Servers
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\kill-and-restart.ps1"
pause
