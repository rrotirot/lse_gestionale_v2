# Comandi per verificare le porte su Windows

## 1. Verificare se una porta è in ascolto
```powershell
netstat -ano | findstr :5174
```
Mostra se la porta è in uso e quale processo la usa.

## 2. Testare la connessione a una porta
```powershell
Test-NetConnection -ComputerName localhost -Port 5174
```
Verifica se puoi connetterti alla porta (TcpTestSucceeded: True = OK)

## 3. Verificare regole firewall per una porta
```powershell
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*5174*"}
```
Mostra regole firewall specifiche per quella porta.

## 4. Controllare tutte le porte in ascolto
```powershell
netstat -ano | findstr LISTENING
```
Mostra tutte le porte in ascolto sul sistema.

## 5. Verificare regole firewall in ingresso
```powershell
Get-NetFirewallRule -Direction Inbound | Format-Table DisplayName, Enabled, Action
```
Mostra tutte le regole firewall in ingresso.

## 6. Aprire una porta nel firewall (se necessario)
```powershell
New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -LocalPort 5174 -Protocol TCP -Action Allow
```
Apre una porta nel firewall (solo se necessario).

