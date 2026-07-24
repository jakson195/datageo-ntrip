Set-Location "C:\VISION\APP-SOLODATANTRIP"
Write-Host ">> Salvando no Git..." -ForegroundColor Yellow
$msg = Read-Host "Descricao da atualizacao"
if ([string]::IsNullOrWhiteSpace($msg)) { $msg = "atualizacao $(Get-Date -Format 'dd/MM/yyyy HH:mm')" }
git add .
git commit -m "$msg"
git push origin main
Write-Host ">> Publicando no Vercel..." -ForegroundColor Yellow
vercel --prod
Write-Host "Publicado!" -ForegroundColor Green
Read-Host "Pressione Enter para fechar"
