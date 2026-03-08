@echo off
REM Start Cloudflare Tunnel for Sentinel Processing Server
REM Routes rig.faithandharmonyllc.com -> localhost:8000

echo Starting Cloudflare Tunnel (sentinel-rig)...
echo Endpoint: https://rig.faithandharmonyllc.com
echo.
cloudflared tunnel run sentinel-rig
