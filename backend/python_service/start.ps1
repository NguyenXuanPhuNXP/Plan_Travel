$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot | Split-Path -Parent
$pythonExe = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $pythonExe)) {
    $pythonExe = Join-Path $projectRoot '.venv\Scripts\python.exe'
}

if (-not (Test-Path -LiteralPath $pythonExe)) {
    throw "Không tìm thấy Python environment. Tạo môi trường tại $PSScriptRoot\.venv hoặc sửa/chọn lại $projectRoot\.venv."
}

$uvicornCheck = & $pythonExe -c 'import uvicorn' 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "Không import được uvicorn từ $pythonExe. Hãy kiểm tra/re tạo .venv rồi chạy: `"$pythonExe`" -m pip install -r `"$PSScriptRoot\requirements.txt`". Lỗi: $uvicornCheck"
}

Set-Location $PSScriptRoot
& $pythonExe -m uvicorn src.main:app --host 0.0.0.0 --port 8001
