$serverDir = "D:\CodeArts Agent\test_projects\server"
$stdout = "$serverDir\startup.log"
$stderr = "$serverDir\startup_err.log"

Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

$p = Start-Process -FilePath "node" -ArgumentList "src/app.js" -WorkingDirectory $serverDir -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr

Start-Sleep -Seconds 4

Write-Output "PID: $($p.Id), HasExited: $($p.HasExited)"

if (-not $p.HasExited) {
  $conn = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
  if ($conn) {
    Write-Output "PORT 3001 LISTENING, PID: $($conn.OwningProcess)"
  } else {
    Write-Output "PORT 3001 NOT LISTENING"
  }
} else {
  Write-Output "PROCESS EXITED, ExitCode: $($p.ExitCode)"
}

Write-Output "--- stdout ---"
if (Test-Path $stdout) { Get-Content $stdout | Select-Object -First 10 }
Write-Output "--- stderr ---"
if (Test-Path $stderr) { Get-Content $stderr | Select-Object -First 10 }
