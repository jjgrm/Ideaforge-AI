$ErrorActionPreference = 'Stop'
$taskKey = Read-Host 'Paste your Gemini API key (hidden)' -AsSecureString
if ($taskKey.Length -lt 15) { throw 'The key is too short.' }
$taskSecretFolder = Join-Path $env:LOCALAPPDATA 'IdeaForge'
New-Item -ItemType Directory -Force -Path $taskSecretFolder | Out-Null
$taskKey | ConvertFrom-SecureString | Set-Content -LiteralPath (Join-Path $taskSecretFolder 'gemini-key.dpapi') -Encoding utf8
Write-Host 'Saved encrypted for your Windows account only. Return to Codex and say the key is ready.'
Read-Host 'Press Enter to close'
