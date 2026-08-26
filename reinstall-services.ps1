Write-Host "=== Reinstall Services ===" -ForegroundColor Cyan

# 1. Stop services
Write-Host "`n[1/4] Dung services cu..."
net stop "ZaloBot EGAS Polling" 2>$null
net stop "ZaloBot EGAS AMS Monitor" 2>$null
Start-Sleep -Seconds 3

# 2. Delete services
Write-Host "[2/4] Xoa services cu..."
sc.exe delete "ZaloBot EGAS Polling" 2>$null
sc.exe delete "ZaloBot EGAS AMS Monitor" 2>$null
Start-Sleep -Seconds 5

# 3. Verify clean
$remaining = Get-Service | Where-Object { $_.Name -like '*zalo*' }
if ($remaining) {
    Write-Host "  Van con services: $($remaining.Name -join ', ')" -ForegroundColor Yellow
} else {
    Write-Host "  Da xoa sach." -ForegroundColor Green
}

# 4. Install new services
Write-Host "`n[3/4] Cai services moi..."
Set-Location "C:\Users\PC\Desktop\Code\ZaloBot"
node dist/install/install-service.js polling
Start-Sleep -Seconds 5
node dist/install/install-service.js monitor
Start-Sleep -Seconds 5

# 5. Verify
Write-Host "`n[4/4] Kiem tra..."
Get-Service | Where-Object { $_.Name -like '*zalo*' -or $_.Name -like '*Zalo*' } | Format-Table Name, Status, DisplayName -AutoSize
Write-Host "`nHOAN THANH!" -ForegroundColor Green
Read-Host "`nAn Enter de dong"
