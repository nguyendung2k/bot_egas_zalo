Write-Host "=== BUOC 1: Kill tat ca node processes ==="
Get-Process "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Write-Host "Done`n"

Write-Host "=== BUOC 2: Xoa services (dang marked for deletion) ==="
sc.exe delete "zalobotegaspolling.exe" 2>&1
sc.exe delete "zalobotegasamsmonitor.exe" 2>&1
Write-Host "Cho 15 giay..."
Start-Sleep -Seconds 15

# Kiem tra
$check = Get-Service "zalobotega*" -ErrorAction SilentlyContinue
if ($check) {
    Write-Host "Van con ton tai:"
    $check | Format-Table Name, Status -AutoSize
    Write-Host "Thu sc.exe delete lan nua..."
    sc.exe delete "zalobotegaspolling.exe" 2>&1
    sc.exe delete "zalobotegasamsmonitor.exe" 2>&1
    Start-Sleep -Seconds 10
}
$check2 = Get-Service "zalobotega*" -ErrorAction SilentlyContinue
if ($check2) {
    Write-Host "FAILED: Khong xoa duoc. Can restart may."
    exit 1
}
Write-Host "OK: Services da xoa het.`n"

Write-Host "=== BUOC 3: Cai services moi ==="
cd "C:\Users\PC\Desktop\Code\ZaloBot"
node dist\install\install-service.js polling 2>&1
Start-Sleep -Seconds 5
node dist\install\install-service.js monitor 2>&1
Start-Sleep -Seconds 5

Write-Host "`n=== BUOC 4: Kiem tra ==="
Get-Service "zalobotegasamsmonitor.exe","zalobotegaspolling.exe" -ErrorAction SilentlyContinue | Format-Table Name, Status, StartType -AutoSize
