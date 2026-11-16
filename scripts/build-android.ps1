$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$sdkPath = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
if (-not (Test-Path -LiteralPath $sdkPath)) { throw 'Android SDK not found. Set ANDROID_HOME.' }
$env:ANDROID_HOME = $sdkPath
Push-Location -LiteralPath $projectRoot
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'JS bundle build failed.' }
    Push-Location -LiteralPath (Join-Path $projectRoot 'apps\android')
    try {
        & '.\gradlew.bat' ':app:assembleInstagramDebug' ':app:assembleFacebookDebug' '--no-daemon'
        if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' }
    } finally { Pop-Location }
    $destination = Join-Path $projectRoot 'Build\android'
    New-Item -ItemType Directory -Force -Path $destination | Out-Null
    Copy-Item -LiteralPath (Join-Path $projectRoot 'apps\android\app\build\outputs\apk\instagram\debug\app-instagram-debug.apk') -Destination (Join-Path $destination 'SocialFilter-Instagram-debug.apk') -Force
    Copy-Item -LiteralPath (Join-Path $projectRoot 'apps\android\app\build\outputs\apk\facebook\debug\app-facebook-debug.apk') -Destination (Join-Path $destination 'SocialFilter-Facebook-debug.apk') -Force
    $legacyApk = Join-Path $destination 'SocialFilter-debug.apk'
    if (Test-Path -LiteralPath $legacyApk) { Remove-Item -LiteralPath $legacyApk }
} finally { Pop-Location }
