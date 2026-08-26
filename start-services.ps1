Write-Host "=== Enable + Start services ==="
sc.exe config "zalobotegaspolling.exe" start= auto 2>&1
sc.exe config "zalobotegasamsmonitor.exe" start= auto 2>&1

Start-Sleep -Seconds 2

Write-Host "`n=== Start Polling ==="
Start-Service "zalobotegaspolling.exe" 2>&1
Start-Sleep -Seconds 3

Write-Host "=== Start Monitor ==="
Start-Service "zalobotegasamsmonitor.exe" 2>&1
Start-Sleep -Seconds 5

Write-Host "`n=== Ket qua ==="
Get-Service "zalobotegasamsmonitor.exe","zalobotegaspolling.exe" | Format-Table Name, Status, StartType -AutoSize
