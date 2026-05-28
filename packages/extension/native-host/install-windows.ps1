# Registers the ContextKit native messaging host for Google Chrome on Windows.
# Verified 2026-05-28 against:
#   https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
# Per-user registry key:
#   HKCU\SOFTWARE\Google\Chrome\NativeMessagingHosts\app.contextkit.bridge

$ErrorActionPreference = "Stop"

$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$HostName = "app.contextkit.bridge"
$SrcManifest = Join-Path $Here "host-manifest.json"
$DstManifest = Join-Path $Here "$HostName.json"
$Bridge = Join-Path $Here "bridge.js"

# bridge.js needs a launcher on Windows because Chrome execs the path directly.
# We write a .cmd wrapper that invokes node bridge.js so Node is required on PATH.
$Wrapper = Join-Path $Here "$HostName.cmd"
@"
@echo off
node "$Bridge" %*
"@ | Set-Content -Path $Wrapper -Encoding ASCII

$json = Get-Content $SrcManifest -Raw | ConvertFrom-Json
$json.path = $Wrapper
$json | ConvertTo-Json -Depth 10 | Set-Content -Path $DstManifest -Encoding UTF8

$KeyPath = "HKCU:\SOFTWARE\Google\Chrome\NativeMessagingHosts\$HostName"
New-Item -Path $KeyPath -Force | Out-Null
Set-ItemProperty -Path $KeyPath -Name "(default)" -Value $DstManifest

Write-Host "Registered $HostName -> $DstManifest"
Write-Host "Edit $DstManifest and replace REPLACE_WITH_UNPACKED_EXTENSION_ID with your Chrome extension ID."
