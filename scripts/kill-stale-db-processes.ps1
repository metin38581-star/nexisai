# Supabase/Prisma havuz kilitlerini temizler — askıda kalan node/prisma süreçlerini sonlandırır.
# Kullanım: powershell -ExecutionPolicy Bypass -File scripts/kill-stale-db-processes.ps1

$ErrorActionPreference = "SilentlyContinue"

Write-Host "[DB-CLEANUP] Askida kalan Node/Prisma surecleri araniyor..."

$targets = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object {
    $cmd = $_.CommandLine
    if (-not $cmd) { return $false }
    return (
      $cmd -match "prisma" -or
      $cmd -match "next dev" -or
      $cmd -match "next build" -or
      $cmd -match "ensure-core-tables" -or
      $cmd -match "ensure-question-hub"
    )
  }

if (-not $targets -or $targets.Count -eq 0) {
  Write-Host "[DB-CLEANUP] Sonlandirilacak surec bulunamadi."
  exit 0
}

foreach ($process in $targets) {
  $shortCmd = $process.CommandLine
  if ($shortCmd.Length -gt 120) {
    $shortCmd = $shortCmd.Substring(0, 120) + "..."
  }
  Write-Host ("[DB-CLEANUP] PID {0} sonlandiriliyor: {1}" -f $process.ProcessId, $shortCmd)
  Stop-Process -Id $process.ProcessId -Force
}

Write-Host "[DB-CLEANUP] Tamamlandi. Prisma migrate icin DIRECT_URL'in db.<ref>.supabase.co:5432 oldugundan emin olun."
