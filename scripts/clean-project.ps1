$ErrorActionPreference = 'Stop'
$workspacePath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$targets = @(
    'archive', 'node_modules', '.vs', 'frontend/dist',
    'backend/python_service/package-lock.json',
    'api_err.log', 'api_out.log', '.blackboxrules'
)
$pythonRoot = Join-Path $workspacePath 'backend/python_service'
if (Test-Path -LiteralPath $pythonRoot) {
    $targets += @(Get-ChildItem -LiteralPath $pythonRoot -Directory -Recurse -Filter '__pycache__' | ForEach-Object { $_.FullName })
}
foreach ($target in $targets) {
    $absoluteTarget = if ([IO.Path]::IsPathRooted($target)) {
        [IO.Path]::GetFullPath($target)
    } else {
        [IO.Path]::GetFullPath((Join-Path $workspacePath $target))
    }
    if (-not $absoluteTarget.StartsWith($workspacePath + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw "Target is outside the project: $absoluteTarget"
    }
    if (Test-Path -LiteralPath $absoluteTarget) {
        Remove-Item -LiteralPath $absoluteTarget -Recurse -Force
        Write-Host "Removed: $absoluteTarget"
    }
}
