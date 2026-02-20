@echo off
REM Start Cloudflare Tunnel for Sentinel Processing Server
REM Requires cloudflared to be installed and configured

echo Starting Cloudflare Tunnel (sentinel-rig)...
cloudflared tunnel run sentinel-rig
