param([ValidateSet('armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64')][string]$FacebookAbi)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$sdkPath = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
if (-not (Test-Path -LiteralPath $sdkPath)) { throw 'Android SDK not found. Set ANDROID_HOME.' }
$env:ANDROID_HOME = $sdkPath
if (-not $FacebookAbi) {
    $adbPath = Join-Path $sdkPath 'platform-tools\adb.exe'
    if (Test-Path -LiteralPath $adbPath) {
        $abiOutput = & $adbPath shell getprop ro.product.cpu.abi 2>$null
        if ($LASTEXITCODE -eq 0 -and $abiOutput) {
            $detectedAbi = ([string]($abiOutput | Select-Object -First 1)).Trim()
            if ($detectedAbi -in @('armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64')) { $FacebookAbi = $detectedAbi }
        }
    }
}
Push-Location -LiteralPath $projectRoot
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'JS bundle build failed.' }
    Push-Location -LiteralPath (Join-Path $projectRoot 'apps\android')
    try {
        $gradleArgs = @(':app:assembleInstagramDebug', ':app:assembleFacebookDebug', '--no-daemon')
        if ($FacebookAbi) { $gradleArgs += "-PfacebookAbi=$FacebookAbi"; Write-Output "Facebook APK ABI: $FacebookAbi" }
        & '.\gradlew.bat' @gradleArgs
        if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' }
    } finally { Pop-Location }
    $destination = Join-Path $projectRoot 'Build\android'
    New-Item -ItemType Directory -Force -Path $destination | Out-Null
    Copy-Item -LiteralPath (Join-Path $projectRoot 'apps\android\app\build\outputs\apk\instagram\debug\app-instagram-debug.apk') -Destination (Join-Path $destination 'SocialFilter-Instagram-debug.apk') -Force
    Copy-Item -LiteralPath (Join-Path $projectRoot 'apps\android\app\build\outputs\apk\facebook\debug\app-facebook-debug.apk') -Destination (Join-Path $destination 'SocialFilter-Facebook-debug.apk') -Force
    $legacyApk = Join-Path $destination 'SocialFilter-debug.apk'
    if (Test-Path -LiteralPath $legacyApk) { Remove-Item -LiteralPath $legacyApk }
} finally { Pop-Location }
