# Script di Benchmark Specializzato per gpt-oss:120b
# Testa diverse configurazioni di ottimizzazione riavviando Ollama ogni volta
# per avere misurazioni pulite e comparabili

# Configurazione dei colori per output leggibile
$OriginalColor = $host.UI.RawUI.ForegroundColor

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

# Funzione per terminare completamente Ollama
function Stop-OllamaCompletely {
    Write-Output "`nTermino tutti i processi Ollama..."
    
    # Cerca e termina tutti i processi Ollama
    $ollamaProcesses = Get-Process -Name "ollama*" -ErrorAction SilentlyContinue
    
    if ($ollamaProcesses) {
        foreach ($proc in $ollamaProcesses) {
            Write-Output "  Termino processo: $($proc.Name) (PID: $($proc.Id))"
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
        
        # Attendi che i processi siano effettivamente terminati
        Start-Sleep -Seconds 3
        
        # Verifica che siano stati terminati
        $remainingProcesses = Get-Process -Name "ollama*" -ErrorAction SilentlyContinue
        if ($remainingProcesses) {
            Write-ColorOutput red "  ATTENZIONE: Alcuni processi Ollama sono ancora attivi"
            return $false
        }
        
        Write-ColorOutput green "  Tutti i processi Ollama sono stati terminati"
        return $true
    } else {
        Write-Output "  Nessun processo Ollama trovato"
        return $true
    }
}

# Funzione per avviare Ollama e attendere che sia pronto
function Start-OllamaAndWait {
    Write-Output "`nAvvio Ollama..."
    
    # Avvia Ollama in background
    # Nota: questo comando potrebbe variare in base a come Ollama e' installato
    # Se Ollama e' un servizio Windows, usare: Start-Service Ollama
    # Se e' un'applicazione, usare: Start-Process ollama -ArgumentList "serve"
    
    # Tenta prima come servizio
    $service = Get-Service -Name "Ollama" -ErrorAction SilentlyContinue
    if ($service) {
        Start-Service -Name "Ollama"
        Write-Output "  Ollama avviato come servizio Windows"
    } else {
        # Avvia come processo
        Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
        Write-Output "  Ollama avviato come processo"
    }
    
    # Attendi che Ollama sia pronto a rispondere
    Write-Output "  Attendo che Ollama sia pronto..."
    $maxAttempts = 30
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        try {
            $null = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 2 -ErrorAction Stop
            Write-ColorOutput green "  Ollama e' pronto dopo $attempt secondi"
            return $true
        }
        catch {
            $attempt++
            Start-Sleep -Seconds 1
        }
    }
    
    Write-ColorOutput red "  ERRORE: Ollama non risponde dopo $maxAttempts secondi"
    return $false
}

# Funzione per impostare le variabili d'ambiente Ollama
function Set-OllamaEnvironment {
    param(
        [hashtable]$Variables
    )
    
    Write-Output "`nConfigurazione variabili d'ambiente:"
    
    # Rimuovi prima tutte le variabili Ollama esistenti per partire da zero
    $env:OLLAMA_FLASH_ATTENTION = $null
    $env:OLLAMA_KV_CACHE_TYPE = $null
    $env:CUDA_VISIBLE_DEVICES = $null
    $env:OLLAMA_NUM_PARALLEL = $null
    $env:OLLAMA_MAX_LOADED_MODELS = $null
    
    # Imposta le nuove variabili
    foreach ($key in $Variables.Keys) {
        $value = $Variables[$key]
        [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
        Write-Output "  $key = $value"
    }
}

# Funzione per eseguire un test con una configurazione specifica
function Invoke-ConfigurationTest {
    param(
        [string]$ConfigName,
        [string]$ConfigDescription,
        [hashtable]$EnvVariables,
        [string]$Prompt
    )
    
    Write-ColorOutput cyan "`n=================================================================="
    Write-ColorOutput cyan "TEST: $ConfigName"
    Write-ColorOutput cyan "$ConfigDescription"
    Write-ColorOutput cyan "==================================================================`n"
    
    # Fase 1: Termina Ollama se e' in esecuzione
    $stopped = Stop-OllamaCompletely
    if (-not $stopped) {
        Write-ColorOutput red "Impossibile terminare Ollama completamente. Salta questo test."
        return $null
    }
    
    # Attendi un momento per liberare completamente la memoria
    Write-Output "Attendo 5 secondi per liberare completamente la memoria..."
    Start-Sleep -Seconds 5
    
    # Fase 2: Configura le variabili d'ambiente
    Set-OllamaEnvironment -Variables $EnvVariables
    
    # Fase 3: Avvia Ollama
    $started = Start-OllamaAndWait
    if (-not $started) {
        Write-ColorOutput red "Impossibile avviare Ollama. Salta questo test."
        return $null
    }
    
    # Attendi un momento aggiuntivo per stabilizzare
    Start-Sleep -Seconds 2
    
    # Fase 4: Esegui il test
    Write-Output "`nEsecuzione del test..."
    Write-Output "Modello: gpt-oss:120b"
    Write-Output "Prompt: $($Prompt.Substring(0, [Math]::Min(100, $Prompt.Length)))..."
    
    # Cattura stato iniziale della memoria
    Write-Output "`nStato memoria prima del test:"
    $memBefore = Get-CimInstance Win32_OperatingSystem
    $ramFreeBefore = [Math]::Round($memBefore.FreePhysicalMemory / 1MB, 2)
    Write-Output "  RAM libera: $ramFreeBefore GB"
    
    # Prepara la richiesta
    $body = @{
        model = "gpt-oss:120b"
        prompt = $Prompt
        stream = $false
        options = @{
            temperature = 0.7
            num_predict = 1000  # Genera 1000 token per test significativo
        }
    } | ConvertTo-Json
    
    # Esegue la richiesta e misura il tempo totale
    $overallStart = Get-Date
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:11434/api/generate" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 600
        
        $overallEnd = Get-Date
        $overallTime = ($overallEnd - $overallStart).TotalSeconds
        
        # Calcola metriche
        $totalTokens = $response.eval_count
        $tokensPerSecond = [Math]::Round($totalTokens / $overallTime, 2)
        
        # Il tempo di caricamento del modello e' incluso nel prompt_eval_duration
        $loadTime = [Math]::Round($response.load_duration / 1000000000, 2)
        $promptEvalTime = [Math]::Round($response.prompt_eval_duration / 1000000000, 2)
        $evalTime = [Math]::Round($response.eval_duration / 1000000000, 2)
        
        # Cattura stato finale della memoria
        Write-Output "`nStato memoria dopo il test:"
        $memAfter = Get-CimInstance Win32_OperatingSystem
        $ramFreeAfter = [Math]::Round($memAfter.FreePhysicalMemory / 1MB, 2)
        $ramUsed = [Math]::Round($ramFreeBefore - $ramFreeAfter, 2)
        Write-Output "  RAM libera: $ramFreeAfter GB"
        Write-Output "  RAM utilizzata dal modello: ~$ramUsed GB"
        
        # Mostra risultati
        Write-ColorOutput green "`nTest completato con successo!"
        Write-Output "`nMetriche temporali:"
        Write-Output "  Tempo caricamento modello: $loadTime secondi"
        Write-Output "  Tempo elaborazione prompt: $promptEvalTime secondi"
        Write-Output "  Tempo generazione: $evalTime secondi"
        Write-Output "  Tempo totale (wall-clock): $([Math]::Round($overallTime, 2)) secondi"
        
        Write-Output "`nMetriche di throughput:"
        Write-Output "  Token generati: $totalTokens"
        Write-Output "  Velocita' generazione: $tokensPerSecond tokens/sec"
        
        # Mostra estratto della risposta
        $responsePreview = $response.response.Substring(0, [Math]::Min(300, $response.response.Length))
        Write-Output "`nEstratto risposta generata:"
        Write-Output "$responsePreview..."
        
        # Restituisce oggetto con i risultati
        return @{
            Success = $true
            ConfigName = $ConfigName
            ConfigDescription = $ConfigDescription
            LoadTime = $loadTime
            PromptEvalTime = $promptEvalTime
            EvalTime = $evalTime
            TotalTime = [Math]::Round($overallTime, 2)
            TokensGenerated = $totalTokens
            TokensPerSecond = $tokensPerSecond
            RamUsed = $ramUsed
            EnvVariables = $EnvVariables
        }
    }
    catch {
        Write-ColorOutput red "`nTest fallito: $($_.Exception.Message)"
        return @{
            Success = $false
            ConfigName = $ConfigName
            ConfigDescription = $ConfigDescription
            Error = $_.Exception.Message
            EnvVariables = $EnvVariables
        }
    }
}

# ============================================================================
# INIZIO DELLO SCRIPT PRINCIPALE
# ============================================================================

Write-ColorOutput cyan @"

==================================================================
    BENCHMARK SPECIALIZZATO: gpt-oss:120b
    Test di configurazioni ottimizzazione
==================================================================

Questo script testera' diverse configurazioni di ottimizzazione
per il modello gpt-oss:120b riavviando Ollama ogni volta per
avere misurazioni pulite e comparabili.

IMPORTANTE: Lo script richiedera' 30-60 minuti per completarsi
perche' ogni test riavvia Ollama da zero.

"@

# Verifica privilegi amministrativi
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-ColorOutput yellow "ATTENZIONE: Lo script non e' in esecuzione come amministratore."
    Write-Output "Alcune operazioni potrebbero fallire. Consigliato: esegui PowerShell come amministratore.`n"
}

# Mostra configurazione sistema
Write-Output "Configurazione del sistema:"
$totalRam = [Math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
Write-Output "  RAM totale: $totalRam GB"
Write-Output "  GPU: Verifica manualmente con nvidia-smi`n"

# Prompt di test - simula generazione di contenuto lungo
$testPrompt = @"
Scrivi un articolo dettagliato e completo sulle AI generative per professionisti aziendali. 
L'articolo deve coprire:
1. Cos'e' l'AI generativa e come funziona in termini semplici
2. Casi d'uso concreti nel business (marketing, customer service, sviluppo prodotto)
3. Come valutare se e quando introdurre AI generativa in azienda
4. Rischi e considerazioni etiche
5. Trend futuri e raccomandazioni pratiche

Il tono deve essere professionale ma accessibile, con esempi concreti e actionable insights.
"@

# Array per raccogliere tutti i risultati
$allResults = @()

# ============================================================================
# DEFINIZIONE DELLE CONFIGURAZIONI DA TESTARE
# ============================================================================

Write-ColorOutput cyan "`n=================================================================="
Write-ColorOutput cyan "CONFIGURAZIONI DA TESTARE"
Write-ColorOutput cyan "==================================================================`n"

Write-Output "Saranno testate le seguenti configurazioni:"
Write-Output "1. BASELINE - Nessuna ottimizzazione"
Write-Output "2. FLASH_ATTENTION - Solo Flash Attention attiva"
Write-Output "3. KV_CACHE - Solo KV Cache quantizzata"
Write-Output "4. FLASH_KV - Flash Attention + KV Cache"
Write-Output "5. DUAL_GPU - Solo configurazione dual GPU"
Write-Output "6. FULL_OPTIMIZED - Tutte le ottimizzazioni insieme"
Write-Output ""

$confirmation = Read-Host "Vuoi procedere con tutti i test? (S/N)"
if ($confirmation -ne "S" -and $confirmation -ne "s") {
    Write-Output "Test annullato dall'utente."
    exit 0
}

# ============================================================================
# ESECUZIONE DEI TEST
# ============================================================================

# Test 1: Baseline - Nessuna ottimizzazione
$allResults += Invoke-ConfigurationTest `
    -ConfigName "BASELINE" `
    -ConfigDescription "Nessuna ottimizzazione attiva - baseline di riferimento" `
    -EnvVariables @{} `
    -Prompt $testPrompt

# Test 2: Solo Flash Attention
$allResults += Invoke-ConfigurationTest `
    -ConfigName "FLASH_ATTENTION" `
    -ConfigDescription "Solo Flash Attention attiva" `
    -EnvVariables @{
        "OLLAMA_FLASH_ATTENTION" = "1"
    } `
    -Prompt $testPrompt

# Test 3: Solo KV Cache quantizzata
$allResults += Invoke-ConfigurationTest `
    -ConfigName "KV_CACHE" `
    -ConfigDescription "Solo KV Cache quantizzata (q8_0)" `
    -EnvVariables @{
        "OLLAMA_KV_CACHE_TYPE" = "q8_0"
    } `
    -Prompt $testPrompt

# Test 4: Flash Attention + KV Cache
$allResults += Invoke-ConfigurationTest `
    -ConfigName "FLASH_KV" `
    -ConfigDescription "Flash Attention + KV Cache quantizzata" `
    -EnvVariables @{
        "OLLAMA_FLASH_ATTENTION" = "1"
        "OLLAMA_KV_CACHE_TYPE" = "q8_0"
    } `
    -Prompt $testPrompt

# Test 5: Solo Dual GPU
$allResults += Invoke-ConfigurationTest `
    -ConfigName "DUAL_GPU" `
    -ConfigDescription "Configurazione esplicita dual GPU" `
    -EnvVariables @{
        "CUDA_VISIBLE_DEVICES" = "0,1"
    } `
    -Prompt $testPrompt

# Test 6: Tutte le ottimizzazioni
$allResults += Invoke-ConfigurationTest `
    -ConfigName "FULL_OPTIMIZED" `
    -ConfigDescription "Tutte le ottimizzazioni attive" `
    -EnvVariables @{
        "OLLAMA_FLASH_ATTENTION" = "1"
        "OLLAMA_KV_CACHE_TYPE" = "q8_0"
        "CUDA_VISIBLE_DEVICES" = "0,1"
        "OLLAMA_NUM_PARALLEL" = "4"
        "OLLAMA_MAX_LOADED_MODELS" = "2"
    } `
    -Prompt $testPrompt

# Termina Ollama al completamento di tutti i test
Write-ColorOutput yellow "`n`nTutti i test completati. Termino Ollama..."
Stop-OllamaCompletely

# ============================================================================
# ANALISI E RIEPILOGO RISULTATI
# ============================================================================

Write-ColorOutput cyan "`n`n=================================================================="
Write-ColorOutput cyan "                 ANALISI COMPARATIVA RISULTATI                    "
Write-ColorOutput cyan "==================================================================`n"

# Filtra solo i test riusciti
$successfulTests = $allResults | Where-Object { $_.Success -eq $true }

if ($successfulTests.Count -eq 0) {
    Write-ColorOutput red "Nessun test completato con successo."
    Write-Output "Controlla i log sopra per identificare i problemi."
    exit 1
}

# Tabella comparativa principale
Write-Output "`nTabella comparativa delle performance:"
Write-Output ("=" * 110)
Write-Output ("{0,-20} {1,15} {2,15} {3,15} {4,15} {5,15}" -f `
    "Configurazione", "Load (s)", "Prompt (s)", "Gen (s)", "Tot (s)", "Tokens/Sec")
Write-Output ("=" * 110)

foreach ($result in $successfulTests) {
    Write-Output ("{0,-20} {1,15} {2,15} {3,15} {4,15} {5,15}" -f `
        $result.ConfigName,
        $result.LoadTime,
        $result.PromptEvalTime,
        $result.EvalTime,
        $result.TotalTime,
        $result.TokensPerSecond)
}
Write-Output ("=" * 110)

# Identifica la configurazione migliore
$bestConfig = $successfulTests | Sort-Object -Property TokensPerSecond -Descending | Select-Object -First 1
$worstConfig = $successfulTests | Sort-Object -Property TokensPerSecond | Select-Object -First 1

Write-ColorOutput green "`nConfigurazione MIGLIORE:"
Write-Output "  Nome: $($bestConfig.ConfigName)"
Write-Output "  Velocita': $($bestConfig.TokensPerSecond) tokens/sec"
Write-Output "  Tempo totale: $($bestConfig.TotalTime) secondi"
Write-Output "  Descrizione: $($bestConfig.ConfigDescription)"

Write-ColorOutput red "`nConfigurazione PEGGIORE:"
Write-Output "  Nome: $($worstConfig.ConfigName)"
Write-Output "  Velocita': $($worstConfig.TokensPerSecond) tokens/sec"
Write-Output "  Tempo totale: $($worstConfig.TotalTime) secondi"

# Calcola miglioramento percentuale
$improvement = [Math]::Round((($bestConfig.TokensPerSecond - $worstConfig.TokensPerSecond) / $worstConfig.TokensPerSecond) * 100, 1)
Write-Output "`nMiglioramento: +$improvement% rispetto alla configurazione peggiore"

# Analisi uso memoria
Write-Output "`n`nAnalisi uso memoria RAM:"
Write-Output ("=" * 60)
Write-Output ("{0,-20} {1,20}" -f "Configurazione", "RAM Usata (GB)")
Write-Output ("=" * 60)

foreach ($result in $successfulTests) {
    Write-Output ("{0,-20} {1,20}" -f $result.ConfigName, $result.RamUsed)
}
Write-Output ("=" * 60)

# Raccomandazioni pratiche
Write-ColorOutput cyan "`n`nRACCOMANDAZIONI PRATICHE"
Write-ColorOutput cyan "==================================================================`n"

Write-Output "Sulla base dei risultati ottenuti:"
Write-Output ""
Write-Output "1. CONFIGURAZIONE OTTIMALE per il tuo sistema:"
Write-Output "   Usa la configurazione: $($bestConfig.ConfigName)"
Write-Output ""
Write-Output "2. TEMPO ATTESO per generazione contenuti:"
$tokensPerMinute = $bestConfig.TokensPerSecond * 60
Write-Output "   A $($bestConfig.TokensPerSecond) tokens/sec generi circa $([Math]::Round($tokensPerMinute, 0)) token/minuto"
Write-Output "   - Articolo breve (500 token): ~$([Math]::Round(500 / $bestConfig.TokensPerSecond / 60, 1)) minuti"
Write-Output "   - Articolo medio (2000 token): ~$([Math]::Round(2000 / $bestConfig.TokensPerSecond / 60, 1)) minuti"
Write-Output "   - Articolo lungo (5000 token): ~$([Math]::Round(5000 / $bestConfig.TokensPerSecond / 60, 1)) minuti"
Write-Output ""
Write-Output "3. Per applicare permanentemente la configurazione migliore:"
Write-Output "   Imposta queste variabili d'ambiente a livello utente o sistema:"

foreach ($key in $bestConfig.EnvVariables.Keys) {
    $value = $bestConfig.EnvVariables[$key]
    Write-Output "   $key = $value"
}

# Salva risultati dettagliati in JSON
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outputFile = "gpt_oss_120b_optimization_test_$timestamp.json"
$allResults | ConvertTo-Json -Depth 10 | Out-File $outputFile

Write-ColorOutput green "`n`nBenchmark specializzato completato!"
Write-Output "Risultati dettagliati salvati in: $outputFile"
Write-Output ""

# Ripristina colore originale
$host.UI.RawUI.ForegroundColor = $OriginalColor
