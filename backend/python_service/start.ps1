$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot | Split-Path -Parent
$pythonCandidates = @(
    (Join-Path $PSScriptRoot '.venv\Scripts\python.exe'),
    (Join-Path $projectRoot '.venv\Scripts\python.exe')
) | Select-Object -Unique
$pythonExe = $null
$environmentErrors = @()

foreach ($candidate in $pythonCandidates) {
    if (-not (Test-Path -LiteralPath $candidate)) { continue }
    $uvicornCheck = & $candidate -c 'import uvicorn' 2>&1
    if ($LASTEXITCODE -eq 0) {
        $pythonExe = $candidate
        break
    }
    $environmentErrors += "$candidate`: $uvicornCheck"
}

if (-not $pythonExe) {
    $installTarget = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
    throw "Không tìm thấy môi trường AI có uvicorn. Tạo môi trường tại $PSScriptRoot\.venv hoặc cài requirements.txt. Ví dụ: `"$installTarget`" -m pip install -r `"$PSScriptRoot\requirements.txt`". $($environmentErrors -join ' | ')"
}

Set-Location $PSScriptRoot
& $pythonExe -m uvicorn src.main:app --host 0.0.0.0 --port 8001
