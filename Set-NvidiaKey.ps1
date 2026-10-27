$ErrorActionPreference = 'Stop'
$Host.UI.RawUI.WindowTitle = 'IdeaForge - NVIDIA API key'
Write-Host 'IdeaForge - NVIDIA / DeepSeek connection'
Write-Host 'Paste the NVIDIA API key below, then press Enter. Input is hidden.'
Write-Host 'This saves the key locally only; no AI request will be sent.'
$taskNvidiaKey = Read-Host 'NVIDIA API key' -AsSecureString
if ($taskNvidiaKey.Length -lt 15) { throw 'The key is too short. Nothing was saved.' }
$taskSecretFolder = Join-Path $env:LOCALAPPDATA 'IdeaForge'
New-Item -ItemType Directory -Force -Path $taskSecretFolder | Out-Null
$taskNvidiaKey | ConvertFrom-SecureString | Set-Content -LiteralPath (Join-Path $taskSecretFolder 'nvidia-key.dpapi') -Encoding utf8
$taskNvidiaKey.Dispose()
Write-Host 'Saved encrypted for this Windows account. Return to Codex and say: key ready.' -ForegroundColor Green
Read-Host 'Press Enter to close'
