# Riepilogo Ottimizzazione Sistema Ollama - gpt-oss:120b

**Data:** 6-7 Ottobre 2025  
**Obiettivo:** Ottimizzare le performance del modello gpt-oss:120b (120 miliardi parametri) su nuovo sistema Windows 11

---

## Configurazione Hardware

### Sistema principale
- **CPU:** AMD Ryzen 7 9800X3D 8-Core @ 4.70 GHz
- **RAM:** 192 GB DDR5 (KINGSTON 4x48 GB)
- **GPU Principale:** NVIDIA GeForce RTX 4090 (24 GB VRAM)
- **GPU Secondaria:** NVIDIA GeForce RTX 3080 Ti (12 GB VRAM)
- **GPU Terziaria:** AMD Radeon (2 GB) - non utilizzata da Ollama
- **Storage:** 3x SSD da 2 TB
- **Sistema Operativo:** Windows 11 (versione 10.0.26100)

### Configurazione Ollama
- **Percorso modelli:** D:\MODELLI\OLLAMA
- **Versione:** Da verificare con `ollama --version`

---

## Modelli Installati (19 totali)

### Fascia Grande (>50GB)
- **gpt-oss:120b** - 60.8 GB (modello principale da ottimizzare)

### Fascia Media (15-32GB)
- qwen3:30b - 17.3 GB
- gemma3:27b-it-qat - 16.8 GB
- gemma3:27b - 16.2 GB
- gemma3:27b-it-q4_K_M - 16.2 GB
- qwen2.5vl:32b - 19.7 GB
- deepseek-r1:32b - 18.5 GB
- mistral-small3.2:24b - 14.1 GB
- puyangwang/medgemma-27b-it:q6 - 21.4 GB
- alibayram/medgemma:27b - 15.4 GB

### Fascia Piccola (<15GB)
- gpt-oss:20b - 12.8 GB
- deepseek-coder-v2:16b - 8.3 GB
- qwen2.5-coder:7b - 4.4 GB (fallisce nei test - possibile problema nome)
- llama3.2-vision:11b - 7.3 GB
- gemma3n:e4b - 7.0 GB
- deepseek-r1:8b - 4.9 GB
- llama2:13b - 6.9 GB
- medllama2:latest - 3.6 GB
- alibayram/medgemma:latest - 2.3 GB

---

## Ottimizzazioni Implementate

### Variabili d'ambiente configurate (livello utente)
```
OLLAMA_FLASH_ATTENTION = 1
OLLAMA_KV_CACHE_TYPE = q8_0
OLLAMA_NUM_PARALLEL = 4
OLLAMA_MAX_LOADED_MODELS = 2
CUDA_VISIBLE_DEVICES = 0,1
OLLAMA_MODELS = D:\MODELLI\OLLAMA
```

### Ottimizzazioni sistema Windows
- ✅ Power Plan impostato su "Prestazioni elevate"
- ✅ Esclusione Windows Defender per cartella D:\MODELLI
- ⚠️ Impostazioni GPU NVIDIA da verificare (pannello di controllo)
- ⚠️ File di paging da ottimizzare (attualmente default)

---

## Risultati Test di Performance

### Test Benchmark Comparativo (6 configurazioni testate)

Tutti i test eseguiti con:
- Ollama riavviato da zero per ogni configurazione
- Prompt: generazione articolo AI generative (1000 token)
- Modello: gpt-oss:120b

#### Tabella Risultati

| Configurazione | Load (s) | Prompt (s) | Gen (s) | Tot (s) | Tokens/Sec | RAM Usata (GB) |
|---------------|----------|------------|---------|---------|------------|----------------|
| BASELINE | 10.38 | 2.22 | 99.48 | 114.19 | 8.76 | 33.1 |
| FLASH_ATTENTION | 9.30 | 2.14 | 96.33 | 109.91 | 9.10 | 32.82 |
| KV_CACHE | 9.27 | 2.10 | 93.18 | 106.65 | 9.38 | 32.79 |
| **FLASH_KV** | **8.95** | **2.07** | **90.17** | **103.30** | **9.68** | **32.81** |
| DUAL_GPU | 9.43 | 2.15 | 91.60 | 105.30 | 9.50 | 32.66 |
| FULL_OPTIMIZED | 9.18 | 2.10 | 91.00 | 104.39 | 9.58 | 33.48 |

#### Configurazione Migliore Identificata
**FLASH_KV** (Flash Attention + KV Cache quantizzata)
- Velocità: 9.68 tokens/sec
- Miglioramento vs baseline: +10.5%
- Variabili necessarie:
  - OLLAMA_FLASH_ATTENTION = 1
  - OLLAMA_KV_CACHE_TYPE = q8_0

### Performance Altri Modelli (test preliminari)

#### qwen3:30b
- Primo test (caricamento): 16.68 tokens/sec (latenza 0.57s)
- Secondo test (già carico): 37.42 tokens/sec (latenza 0.42s)
- **Molto veloce quando in memoria**

#### Problemi Rilevati
- qwen2.5-coder:7b fallisce con errore 404 (possibile problema nomenclatura)
- nvidia-smi riporta errore su opzione "memory.used" in alcuni script

---

## Analisi Critica dei Risultati

### Performance Attuale gpt-oss:120b
Con configurazione ottimale (FLASH_KV) a 9.68 tokens/sec:
- Articolo 500 token: ~0.9 minuti
- Articolo 2000 token: ~3.4 minuti  
- Articolo 5000 token: ~8.6 minuti

### Confronto Sistema Precedente
- Sistema vecchio (128 GB RAM): 10-15 minuti per risposte molto lunghe
- Sistema nuovo: 3-9 minuti per stesse risposte
- **Miglioramento: 2-3x**

### Problemi Non Risolti

#### 1. Performance inferiori alle aspettative
Con l'hardware disponibile (192GB RAM DDR5 + 36GB VRAM totali), ci si aspettava:
- Target: 15-25 tokens/sec
- Attuale: ~10 tokens/sec
- **Gap: 50-60% sotto il potenziale**

#### 2. Ottimizzazioni hanno impatto marginale
- Tutte le configurazioni producono risultati simili (8.76-9.68 tokens/sec)
- Differenza massima: +10.5% tra peggiore e migliore
- Flash Attention dovrebbe dare +50-100%, non +4%

#### 3. Uso RAM costante
- Tutte le configurazioni usano ~33GB RAM
- Distribuzione tra GPU e RAM non cambia significativamente
- Suggerisce che il bottleneck non è nell'allocazione memoria

---

## Ipotesi sui Bottleneck

### Ipotesi A: Modello Inefficiente su Hardware Consumer
gpt-oss:120b è ottimizzato per datacenter con:
- Interconnessioni GPU specializzate (NVLink, InfiniBand)
- Architetture diverse (H100, A100)
- Banda memoria superiore

Su sistema consumer, anche potente, potrebbe non sfruttare l'hardware efficacemente.

### Ipotesi B: Distribuzione Subottimale GPU-RAM
Con 36GB VRAM totali e modello da ~33GB:
- Modello dovrebbe stare quasi completamente in VRAM
- Se invece è diviso tra RAM e VRAM, ogni accesso a RAM è 20x più lento
- Necessario verificare con nvidia-smi durante inferenza

### Ipotesi C: Bilanciamento Inefficiente tra le Due GPU
Senza NVLink, le due GPU comunicano via PCIe:
- Overhead nella comunicazione inter-GPU
- Possibile distribuzione non ottimale dei layer
- Una GPU potrebbe lavorare molto più dell'altra

---

## Prossimi Passi Diagnostici Proposti

### 1. Monitoraggio GPU in Tempo Reale (PRIORITÀ)
Verificare durante inferenza:
- Utilizzo VRAM su ciascuna GPU separatamente
- Utilizzo computazionale (%) di ciascuna GPU
- Temperatura e power draw
- Trasferimenti memoria

**Comando nvidia-smi suggerito:**
```bash
nvidia-smi --query-gpu=index,name,memory.used,memory.total,utilization.gpu,utilization.memory,temperature.gpu,power.draw --format=csv --loop=1
```

### 2. Test Modelli Alternativi
Confrontare gpt-oss:120b con:
- llama-3.1:70b (se disponibile)
- qwen2.5:72b (se disponibile)
- Qualsiasi altro modello 70-100B parameter

Se altri modelli generano a 20-30 tokens/sec, il problema è specifico di gpt-oss.

### 3. Test Modelli Più Piccoli ad Alta Efficienza
Valutare se per il caso d'uso (formazione aziendale, blog) è più produttivo usare:
- qwen3:30b che genera a 37 tokens/sec (4x più veloce)
- deepseek-r1:32b o mistral-small3.2:24b
- Trade-off: qualità leggermente inferiore ma throughput 4x superiore

---

## Contesto d'Uso

### Profilo Utente
- **Professione:** Formatore aziendale su AI generative
- **Attività principale:** 
  - Generazione articoli per blog (https://ai-know.pro)
  - Materiali formativi per aziende
  - Gestione gruppo Facebook su AI generative
  
### Casi d'Uso Tipici
- Articoli blog: 2000-5000 token
- Guide e tutorial dettagliati
- Materiali di formazione aziendale
- Risposte approfondite a domande tecniche

### Requisiti Performance
- Tempo accettabile per articolo lungo: 5-10 minuti
- **Attuale con gpt-oss:120b:** 8-9 minuti ✅
- **Potenziale ottimale:** 3-5 minuti con hardware attuale

---

## File e Script Prodotti

### Script di Benchmark
1. **ollama-benchmark.ps1** - Benchmark multi-modello generale
2. **ollama-benchmark-fixed.ps1** - Versione corretta encoding ASCII
3. **benchmark-gpt-oss-optimization.ps1** - Test specializzato configurazioni gpt-oss:120b

### Risultati JSON
1. ollama_benchmark_results_20251006_231339.json - Primo test
2. ollama_benchmark_results_20251006_233219.json - Secondo test (post-riavvio)
3. gpt_oss_120b_optimization_test_20251007_001204.json - Test configurazioni complete

### Documentazione
- Questo documento: riepilogo completo per nuova chat

---

## Domande Aperte per Nuova Chat

1. **nvidia-smi monitoring:** Come interpretare i dati di utilizzo GPU durante inferenza?
2. **Test modelli alternativi:** Vale la pena provare llama o qwen nelle versioni 70B?
3. **Ottimizzazioni BIOS/Driver:** Ci sono configurazioni hardware non ancora esplorate?
4. **Trade-off dimensione/velocità:** Meglio gpt-oss:120b lento o qwen3:30b veloce per il caso d'uso?
5. **NVLink:** L'assenza di NVLink tra le due GPU è il bottleneck principale?

---

## Note Tecniche Importanti

### Persistenza Modelli in Memoria
Ollama mantiene i modelli caricati in memoria tra richieste successive fino alla chiusura del processo. Per test puliti è necessario:
1. Terminare completamente Ollama
2. Attendere liberazione memoria
3. Riavviare Ollama
4. Eseguire test

### Limitazioni nvidia-smi Rilevate
La sintassi `memory.used` genera errori in alcuni contesti. 
Verificare sintassi corretta per la versione driver installata.

### Encoding Script PowerShell
Gli script devono usare solo caratteri ASCII per evitare problemi di parsing.
Evitare caratteri accentati italiani e simboli Unicode nei commenti/output.

---

## Raccomandazioni Immediate

### Da Applicare Subito
1. ✅ Mantenere configurazione FLASH_KV attiva (già fatto)
2. ⚠️ Verificare impostazioni GPU nel pannello NVIDIA
3. ⚠️ Testare nvidia-smi durante inferenza per vedere distribuzione carico

### Da Valutare
1. Test modelli alternativi nella fascia 70-100B
2. Considerare uso prevalente di modelli 30B per velocità superiore
3. Indagare se mancanza NVLink è il problema principale

### Non Prioritario
1. Ulteriori ottimizzazioni software (impatto marginale dimostrato)
2. Overclocking GPU (beneficio limitato dato bottleneck non computazionale)
3. Modifiche BIOS avanzate (rischio > beneficio atteso)

---

**Ultimo aggiornamento:** 7 Ottobre 2025 00:15
**Prossima sessione:** Monitoraggio GPU real-time con nvidia-smi
