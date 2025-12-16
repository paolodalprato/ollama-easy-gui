# Script di Benchmark per Ollama
# Testa le performance del sistema su diversi modelli e tipi di prompt
# Misura: velocita' di generazione (tokens/sec), latenza primo token, uso risorse

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

# Funzione per verificare che Ollama sia in esecuzione
function Test-OllamaRunning {
    try {
        $null = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 5
        return $true
    }
    catch {
        return $false
    }
}

# Funzione per ottenere informazioni GPU prima del test
function Get-GPUInfo {
    try {
        $gpuInfo = nvidia-smi --query-gpu=name, memory.used, memory.total, temperature.gpu, utilization.gpu --format=csv, noheader, nounits
        return $gpuInfo
    }
    catch {
        return "Informazioni GPU non disponibili"
    }
}

# Funzione per eseguire un test di benchmark
function Invoke-OllamaBenchmark {
    param(
        [string]$Model,
        [string]$Prompt,
        [string]$TestName
    )
    
    Write-ColorOutput yellow "`n=== Test: $TestName ==="
    Write-Output "Modello: $Model"
    Write-Output "Prompt: $($Prompt.Substring(0, [Math]::Min(100, $Prompt.Length)))..."
    
    # Prepara il body della richiesta
    $body = @{
        model   = $Model
        prompt  = $Prompt
        stream  = $false
        options = @{
            temperature = 0.7
            num_predict = 500  # Limita a 500 token per test controllato
        }
    } | ConvertTo-Json
    
    # Cattura informazioni GPU prima del test
    Write-Output "`nStato GPU prima del test:"
    Get-GPUInfo | ForEach-Object { Write-Output "  $_" }
    
    # Esegue la richiesta e misura il tempo
    $startTime = Get-Date
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:11434/api/generate" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 300
        
        $endTime = Get-Date
        $totalTime = ($endTime - $startTime).TotalSeconds
        
        # Estrae metriche dalla risposta
        $totalTokens = $response.eval_count
        $tokensPerSecond = [Math]::Round($totalTokens / $totalTime, 2)
        $timeToFirstToken = [Math]::Round($response.prompt_eval_duration / 1000000000, 2)  # Converti da nanosecondi a secondi
        
        # Mostra risultati
        Write-ColorOutput green "`nTest completato con successo"
        Write-Output "Tempo totale: $([Math]::Round($totalTime, 2)) secondi"
        Write-Output "Token generati: $totalTokens"
        Write-Output "Velocita': $tokensPerSecond tokens/sec"
        Write-Output "Latenza primo token: $timeToFirstToken secondi"
        Write-Output "Tempo elaborazione prompt: $([Math]::Round($response.prompt_eval_duration / 1000000000, 2)) secondi"
        
        # Cattura informazioni GPU dopo il test
        Write-Output "`nStato GPU dopo il test:"
        Get-GPUInfo | ForEach-Object { Write-Output "  $_" }
        
        # Mostra un estratto della risposta
        $responsePreview = $response.response.Substring(0, [Math]::Min(200, $response.response.Length))
        Write-Output "`nEstratto risposta: $responsePreview..."
        
        # Restituisce oggetto con metriche per analisi successiva
        return @{
            Success          = $true
            Model            = $Model
            TestName         = $TestName
            TotalTime        = [Math]::Round($totalTime, 2)
            TokensGenerated  = $totalTokens
            TokensPerSecond  = $tokensPerSecond
            TimeToFirstToken = $timeToFirstToken
            PromptEvalTime   = [Math]::Round($response.prompt_eval_duration / 1000000000, 2)
        }
    }
    catch {
        Write-ColorOutput red "`nTest fallito: $($_.Exception.Message)"
        return @{
            Success  = $false
            Model    = $Model
            TestName = $TestName
            Error    = $_.Exception.Message
        }
    }
}

# ============================================================================
# INIZIO DELLO SCRIPT PRINCIPALE
# ============================================================================

Write-ColorOutput cyan "`n"
Write-ColorOutput cyan "=================================================================="
Write-ColorOutput cyan "           OLLAMA PERFORMANCE BENCHMARK SUITE                  "
Write-ColorOutput cyan "                                                               "
Write-ColorOutput cyan "  Questo script testera' le performance del tuo sistema Ollama "
Write-ColorOutput cyan "  su diversi modelli e tipi di prompt.                        "
Write-ColorOutput cyan "=================================================================="
Write-ColorOutput cyan ""

# Verifica che Ollama sia in esecuzione
Write-Output "Verifico che Ollama sia in esecuzione..."
if (-not (Test-OllamaRunning)) {
    Write-ColorOutput red "ERRORE: Ollama non e' in esecuzione o non risponde su localhost:11434"
    Write-Output "Avvia Ollama e riprova."
    exit 1
}
Write-ColorOutput green "Ollama e' in esecuzione`n"

# Mostra configurazione sistema
Write-Output "Configurazione del sistema:"
Write-Output "RAM totale: $([Math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)) GB"
Write-Output "`nGPU disponibili:"
Get-GPUInfo | ForEach-Object { Write-Output "  $_" }

# Mostra variabili d'ambiente Ollama rilevanti
Write-Output "`nVariabili d'ambiente Ollama configurate:"
if ($env:OLLAMA_FLASH_ATTENTION) { Write-Output "  OLLAMA_FLASH_ATTENTION = $env:OLLAMA_FLASH_ATTENTION" }
if ($env:OLLAMA_KV_CACHE_TYPE) { Write-Output "  OLLAMA_KV_CACHE_TYPE = $env:OLLAMA_KV_CACHE_TYPE" }
if ($env:OLLAMA_NUM_PARALLEL) { Write-Output "  OLLAMA_NUM_PARALLEL = $env:OLLAMA_NUM_PARALLEL" }
if ($env:CUDA_VISIBLE_DEVICES) { Write-Output "  CUDA_VISIBLE_DEVICES = $env:CUDA_VISIBLE_DEVICES" }

# Array per raccogliere tutti i risultati
$allResults = @()

# ============================================================================
# DEFINIZIONE DEI TEST
# ============================================================================

# Prompt breve - misura latenza minima e velocita' pura
$shortPrompt = "Spiega in 2-3 frasi cosa sono le reti neurali."

# Prompt medio - misura performance su output tipico
$mediumPrompt = "Scrivi una guida dettagliata su come funziona il meccanismo di attenzione nei transformer. Includi esempi pratici e analogie per rendere il concetto chiaro anche a chi non ha background tecnico."

# Prompt lungo - simula il tuo caso d'uso di risposte estese
$longPrompt = "Scrivi un articolo completo e dettagliato sulle AI generative per il mio blog. L'articolo dovrebbe spiegare i principi fondamentali, le applicazioni pratiche nel business, i rischi e le opportunita', e dovrebbe essere accessibile a professionisti senza background tecnico. Includi esempi concreti e casi d'uso reali."

# ============================================================================
# ESECUZIONE DEI TEST
# ============================================================================

Write-ColorOutput cyan "`n`n=================================================================="
Write-ColorOutput cyan "         FASE 1: TEST MODELLO PICCOLO (7B)                    "
Write-ColorOutput cyan "  Target: massima velocita', tutto in VRAM                     "
Write-ColorOutput cyan "=================================================================="

$allResults += Invoke-OllamaBenchmark -Model "qwen2.5-coder:7b" -Prompt $shortPrompt -TestName "Piccolo - Prompt Breve"
Start-Sleep -Seconds 5  # Pausa tra test per stabilizzare il sistema

$allResults += Invoke-OllamaBenchmark -Model "qwen2.5-coder:7b" -Prompt $mediumPrompt -TestName "Piccolo - Prompt Medio"
Start-Sleep -Seconds 5

Write-ColorOutput cyan "`n`n=================================================================="
Write-ColorOutput cyan "         FASE 2: TEST MODELLO MEDIO (30B)                     "
Write-ColorOutput cyan "  Target: bilanciamento capacita'/velocita'                     "
Write-ColorOutput cyan "=================================================================="

$allResults += Invoke-OllamaBenchmark -Model "qwen3:30b" -Prompt $shortPrompt -TestName "Medio - Prompt Breve"
Start-Sleep -Seconds 5

$allResults += Invoke-OllamaBenchmark -Model "qwen3:30b" -Prompt $mediumPrompt -TestName "Medio - Prompt Medio"
Start-Sleep -Seconds 5

Write-ColorOutput cyan "`n`n=================================================================="
Write-ColorOutput cyan "         FASE 3: TEST MODELLO GRANDE (120B)                   "
Write-ColorOutput cyan "  Target: massima capacita', uso RAM+VRAM                      "
Write-ColorOutput cyan "=================================================================="

# Per il modello grande, testa anche il prompt lungo che e' il tuo caso d'uso principale
$allResults += Invoke-OllamaBenchmark -Model "gpt-oss:120b" -Prompt $shortPrompt -TestName "Grande - Prompt Breve"
Start-Sleep -Seconds 5

$allResults += Invoke-OllamaBenchmark -Model "gpt-oss:120b" -Prompt $mediumPrompt -TestName "Grande - Prompt Medio"
Start-Sleep -Seconds 5

Write-Output "`nPer il modello grande, eseguo anche test con prompt lungo (questo richiedera' piu' tempo)..."
$allResults += Invoke-OllamaBenchmark -Model "gpt-oss:120b" -Prompt $longPrompt -TestName "Grande - Prompt Lungo"

# ============================================================================
# RIEPILOGO FINALE
# ============================================================================

Write-ColorOutput cyan "`n`n=================================================================="
Write-ColorOutput cyan "                 RIEPILOGO RISULTATI                           "
Write-ColorOutput cyan "==================================================================`n"

# Filtra solo i test riusciti
$successfulTests = $allResults | Where-Object { $_.Success -eq $true }

if ($successfulTests.Count -eq 0) {
    Write-ColorOutput red "Nessun test completato con successo."
    exit 1
}

# Crea tabella riepilogativa
Write-Output "`nTabella comparativa delle performance:"
Write-Output ("=" * 90)
Write-Output ("{0,-30} {1,15} {2,15} {3,15}" -f "Test", "Tokens/Sec", "Tempo Tot (s)", "Latenza 1 Token")
Write-Output ("=" * 90)

foreach ($result in $successfulTests) {
    Write-Output ("{0,-30} {1,15} {2,15} {3,15}" -f 
        $result.TestName,
        $result.TokensPerSecond,
        $result.TotalTime,
        $result.TimeToFirstToken)
}
Write-Output ("=" * 90)

# Calcola statistiche aggregate
$avgTokensPerSec = [Math]::Round(($successfulTests | Measure-Object -Property TokensPerSecond -Average).Average, 2)
$maxTokensPerSec = ($successfulTests | Measure-Object -Property TokensPerSecond -Maximum).Maximum
$minTokensPerSec = ($successfulTests | Measure-Object -Property TokensPerSecond -Minimum).Minimum

Write-Output "`nStatistiche aggregate:"
Write-Output "  Velocita' media: $avgTokensPerSec tokens/sec"
Write-Output "  Velocita' massima: $maxTokensPerSec tokens/sec (modello piu' veloce)"
Write-Output "  Velocita' minima: $minTokensPerSec tokens/sec (modello piu' lento)"

# Stima tempo per generare risposte lunghe
Write-Output "`nStime per risposte lunghe (basate su risultati ottenuti):"
$largeModelSpeed = ($successfulTests | Where-Object { $_.Model -eq "gpt-oss:120b" } | Measure-Object -Property TokensPerSecond -Average).Average
if ($largeModelSpeed) {
    $time2000tokens = [Math]::Round(2000 / $largeModelSpeed / 60, 1)
    $time5000tokens = [Math]::Round(5000 / $largeModelSpeed / 60, 1)
    Write-Output "  Con gpt-oss:120b a $([Math]::Round($largeModelSpeed, 2)) tokens/sec:"
    Write-Output "    - Risposta da 2000 token (~3 pagine): circa $time2000tokens minuti"
    Write-Output "    - Risposta da 5000 token (~8 pagine): circa $time5000tokens minuti"
}

# Salva risultati in file JSON per analisi successive
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outputFile = "ollama_benchmark_results_$timestamp.json"
$allResults | ConvertTo-Json -Depth 10 | Out-File $outputFile

Write-ColorOutput green "`nBenchmark completato!"
Write-Output "Risultati salvati in: $outputFile"
Write-Output "`nPer analisi piu' dettagliate, puoi aprire il file JSON e esaminare i dati grezzi."

# Ripristina colore originale
$host.UI.RawUI.ForegroundColor = $OriginalColor