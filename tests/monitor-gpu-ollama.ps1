# Script di Monitoraggio GPU Real-Time per Ollama
# Monitora utilizzo GPU durante l'inferenza per identificare bottleneck

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  MONITORAGGIO GPU REAL-TIME PER OLLAMA" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "Questo script monitora le tue GPU mentre Ollama sta generando."
Write-Host "Premi CTRL+C per terminare il monitoraggio.`n"

Write-Host "COME USARE:" -ForegroundColor Yellow
Write-Host "1. Avvia Ollama in un'altra finestra"
Write-Host "2. Avvia questo script"
Write-Host "3. Inizia una generazione lunga con gpt-oss:120b"
Write-Host "4. Osserva i valori mentre il modello genera"
Write-Host "5. Premi CTRL+C quando hai finito`n"

Write-Host "COSA OSSERVARE:" -ForegroundColor Yellow
Write-Host "- Memory Used: quanto VRAM usa ogni GPU (ideale: distribuito su entrambe)"
Write-Host "- GPU Util %: quanto lavora ogni GPU (ideale: entrambe >80%)"
Write-Host "- Mem Util %: quanto traffico memoria c'e' (ideale: alto durante generazione)"
Write-Host "- Power: consumo energia (alto = GPU lavora intensamente)"
Write-Host "- Temp: temperatura (normale: 60-80C sotto carico)`n"

# Crea file di log con timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = "gpu_monitoring_log_$timestamp.csv"

Write-Host "Log salvato in: $logFile" -ForegroundColor Green
Write-Host "Tutte le misurazioni saranno registrate in questo file per analisi successive.`n"

# Scrivi intestazione CSV
"Timestamp,GPU_Index,GPU_Name,Memory_Used_MB,Memory_Total_MB,Memory_Percent,GPU_Util_Percent,Memory_Util_Percent,Temperature_C,Power_W" | Out-File $logFile -Encoding UTF8

Write-Host "Premi INVIO per avviare il monitoraggio..." -ForegroundColor Green
Read-Host

Write-Host "`nAvvio monitoraggio... (aggiornamento ogni 2 secondi)`n" -ForegroundColor Green

# Ciclo di monitoraggio continuo
$measurementCount = 0
try {
    while ($true) {
        Clear-Host
        
        $currentTime = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        
        Write-Host "============================================================" -ForegroundColor Cyan
        Write-Host "  STATO GPU - $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Cyan
        Write-Host "  Misurazioni registrate: $measurementCount" -ForegroundColor Cyan
        Write-Host "============================================================`n" -ForegroundColor Cyan
        
        # Query nvidia-smi per entrambe le GPU
        $gpuData = nvidia-smi --query-gpu=index,name,memory.used,memory.total,utilization.gpu,utilization.memory,temperature.gpu,power.draw --format=csv,noheader,nounits
        
        if ($gpuData) {
            $gpuLines = $gpuData -split "`n"
            
            foreach ($line in $gpuLines) {
                if ($line.Trim()) {
                    $values = $line -split ","
                    $index = $values[0].Trim()
                    $name = $values[1].Trim()
                    $memUsed = $values[2].Trim()
                    $memTotal = $values[3].Trim()
                    $gpuUtil = $values[4].Trim()
                    $memUtil = $values[5].Trim()
                    $temp = $values[6].Trim()
                    $power = $values[7].Trim()
                    
                    # Calcola percentuale memoria usata
                    $memPercent = [Math]::Round(([double]$memUsed / [double]$memTotal) * 100, 1)
                    
                    # Salva nel file CSV
                    "$currentTime,$index,$name,$memUsed,$memTotal,$memPercent,$gpuUtil,$memUtil,$temp,$power" | Out-File $logFile -Append -Encoding UTF8
                    
                    # Colora output basato su utilizzo
                    $color = "White"
                    if ([double]$gpuUtil -gt 80) { $color = "Green" }
                    elseif ([double]$gpuUtil -gt 50) { $color = "Yellow" }
                    else { $color = "Red" }
                    
                    Write-Host "GPU $index - $name" -ForegroundColor $color
                    Write-Host "  Memory:    $memUsed MB / $memTotal MB ($memPercent%)"
                    Write-Host "  GPU Util:  $gpuUtil%"
                    Write-Host "  Mem Util:  $memUtil%"
                    Write-Host "  Temp:      ${temp}C"
                    Write-Host "  Power:     $power W"
                    Write-Host ""
                }
            }
            
            $measurementCount++
            
            Write-Host "`n------------------------------------------------------------" -ForegroundColor Gray
            Write-Host "INTERPRETAZIONE:" -ForegroundColor Yellow
            
            # Analisi automatica
            $gpu0Data = $gpuLines[0] -split ","
            $gpu1Data = $gpuLines[1] -split ","
            
            $gpu0Util = [double]($gpu0Data[4].Trim())
            $gpu1Util = [double]($gpu1Data[4].Trim())
            
            $gpu0Mem = [double]($gpu0Data[2].Trim())
            $gpu1Mem = [double]($gpu1Data[2].Trim())
            
            # Verifica bilanciamento GPU
            $utilDiff = [Math]::Abs($gpu0Util - $gpu1Util)
            if ($utilDiff -gt 30) {
                Write-Host "! GPU NON BILANCIATE: differenza utilizzo $utilDiff%" -ForegroundColor Red
                Write-Host "  Una GPU lavora molto piu' dell'altra - possibile problema distribuzione layer" -ForegroundColor Red
            } elseif ($gpu0Util -gt 50 -and $gpu1Util -gt 50) {
                Write-Host "* Entrambe GPU attive - buon bilanciamento" -ForegroundColor Green
            } elseif ($gpu0Util -lt 20 -and $gpu1Util -lt 20) {
                Write-Host "? GPU poco utilizzate - possibile bottleneck RAM o CPU" -ForegroundColor Yellow
            }
            
            # Verifica memoria
            $memDiff = [Math]::Abs($gpu0Mem - $gpu1Mem)
            if ($memDiff -gt 5000) {
                Write-Host "! MEMORIA SBILANCIATA: differenza $([Math]::Round($memDiff/1024, 1)) GB" -ForegroundColor Red
                Write-Host "  Modello non distribuito uniformemente tra le GPU" -ForegroundColor Red
            }
            
            # Verifica se sta generando
            if ($gpu0Util -gt 5 -or $gpu1Util -gt 5) {
                Write-Host "* Inferenza in corso - dati validi" -ForegroundColor Green
            } else {
                Write-Host "? GPU inattive - avvia una generazione per vedere dati significativi" -ForegroundColor Yellow
            }
            
        } else {
            Write-Host "Errore: impossibile leggere dati GPU" -ForegroundColor Red
        }
        
        Write-Host "`nProssimo aggiornamento in 2 secondi... (CTRL+C per terminare)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}
catch {
    Write-Host "`n`nMonitoraggio terminato." -ForegroundColor Yellow
}

# Riepilogo finale
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  MONITORAGGIO COMPLETATO" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "Statistiche:" -ForegroundColor Green
Write-Host "  Misurazioni totali: $measurementCount"
Write-Host "  File di log: $logFile"
Write-Host "  Percorso completo: $(Get-Location)\$logFile`n"

Write-Host "COME ANALIZZARE I DATI:" -ForegroundColor Yellow
Write-Host "1. Apri il file CSV con Excel o un editor di testo"
Write-Host "2. Cerca i momenti in cui GPU_Util_Percent e' alto (>50%) = inferenza attiva"
Write-Host "3. Confronta i valori tra GPU 0 e GPU 1 durante inferenza"
Write-Host "4. Allega il file alla nuova chat con Claude per analisi dettagliata`n"

Write-Host "PATTERN DA CERCARE:" -ForegroundColor Yellow
Write-Host "- GPU sbilanciate: una GPU con utilizzo alto, l'altra basso"
Write-Host "- Memoria sbilanciata: VRAM molto diversa tra le due GPU"
Write-Host "- Utilizzo basso: entrambe GPU sotto 30% durante inferenza = bottleneck altrove`n"

Write-Host "Grazie per aver usato lo script di monitoraggio GPU!" -ForegroundColor Cyan
