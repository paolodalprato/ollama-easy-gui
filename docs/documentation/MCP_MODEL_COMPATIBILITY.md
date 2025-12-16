# MCP Model Compatibility Guide

**OllamaGUI - Model Context Protocol Integration**

Questa guida spiega quali modelli Ollama sono compatibili con la funzionalit MCP (Model Context Protocol) di OllamaGUI.

---

## Requisiti per l'Uso di MCP

### Cos' il Function Calling?

Per utilizzare i tool MCP (filesystem, GitHub, search, ecc.), il modello AI deve supportare **"function calling"** (o "tool use"). Questa capacit permette al modello di:

1. **Riconoscere** quando un tool esterno  necessario per rispondere
2. **Generare** chiamate strutturate (JSON) con nome tool e parametri
3. **Interpretare** i risultati restituiti dal tool
4. **Continuare** la conversazione integrando le informazioni ottenute

Non tutti i modelli Ollama hanno questa capacit - solo quelli addestrati specificamente per il function calling.

---

## Modelli Compatibili (Lista Completa)

### Tier 1: Eccellente Supporto

| Modello | Dimensioni | VRAM Richiesta | Note |
|---------|------------|----------------|------|
| **llama3.1** | 8B, 70B, 405B | 6GB / 40GB / 200GB+ | Supporto nativo eccellente |
| **llama3.3** | 70B | 40GB | Ultima versione, ottimizzato |
| **qwen2.5** | 0.5B-72B | 1GB-45GB | Ottimo per multilingua |
| **command-r-plus** | 104B | 65GB+ | Specializzato RAG e tools |
| **hermes3** | 8B, 70B | 6GB / 40GB | Fine-tuned per function calling |
| **firefunction-v2** | 70B | 40GB | Creato specificamente per tools |

### Tier 2: Buon Supporto

| Modello | Dimensioni | VRAM Richiesta | Note |
|---------|------------|----------------|------|
| **llama3.2** | 1B, 3B | 2GB / 3GB | Leggero ma capace |
| **mistral** | 7B | 5GB | Veloce e affidabile |
| **mistral-nemo** | 12B | 8GB | Bilanciato |
| **mixtral** | 8x7B, 8x22B | 26GB / 85GB | MoE, ottimo rapporto |
| **qwen2** | 0.5B-72B | 1GB-45GB | Versione precedente |
| **command-r** | 35B | 22GB | Versione base |

### Tier 3: Supporto Base

| Modello | Dimensioni | VRAM Richiesta | Note |
|---------|------------|----------------|------|
| **qwen2.5-coder** | 1.5B-32B | 2GB-20GB | Specializzato codice |
| **nemotron** | 70B | 40GB | NVIDIA, buone performance |
| **granite3-dense** | 2B, 8B | 2GB / 6GB | IBM, enterprise-ready |
| **granite3-moe** | 1B, 3B | 1GB / 3GB | IBM MoE leggero |
| **smollm2** | 135M-1.7B | <2GB | Ultraleggero |

---

## Modelli NON Compatibili

I seguenti modelli **non supportano function calling** e **non funzioneranno con MCP**:

| Modello | Motivo |
|---------|--------|
| `llama2` (tutte le varianti) | Architettura precedente senza tool support |
| `codellama` | Specializzato solo per codice, no tools |
| `phi` (v1, v2) | Modelli Microsoft senza tool training |
| `phi3` | Versioni base senza function calling |
| `gemma` (v1) | Google, prima generazione |
| `vicuna` | Fine-tune di LLaMA1, obsoleto |
| `orca` | Non addestrato per tools |
| `tinyllama` | Troppo piccolo per tool use |
| `deepseek-v1` | Versione precedente |
| Modelli embedding | `nomic-embed`, `mxbai-embed`, ecc. |

---

## Raccomandazioni per Caso d'Uso

### Per Hardware Consumer (8-16GB VRAM)

```
Consigliato: llama3.1:8b o qwen2.5:7b
- Ottimo equilibrio prestazioni/risorse
- Supporto function calling affidabile
- Velocit di risposta buona
```

### Per Hardware Limitato (4-8GB VRAM)

```
Consigliato: llama3.2:3b o qwen2.5:3b
- Funziona anche con GPU entry-level
- Supporto tools base ma funzionale
- Ideale per test e sviluppo
```

### Per Hardware Enterprise (32GB+ VRAM)

```
Consigliato: llama3.3:70b o command-r-plus
- Massima qualit nelle risposte
- Eccellente comprensione contesto
- Tool use sofisticato
```

### Per Task Specifici

| Task | Modello Consigliato |
|------|---------------------|
| Coding con MCP filesystem | `qwen2.5-coder:7b` |
| Ricerca documenti | `command-r:35b` |
| Multilingua | `qwen2.5:7b` |
| Velocit massima | `llama3.2:3b` |
| Qualit massima | `llama3.3:70b` |

---

## Come Verificare la Compatibilit

### Metodo 1: Verifica Template

```bash
ollama show <model-name> --modelfile
```

Cerca nel template riferimenti a:
- `tools`
- `tool_call`
- `function`
- `<|tool|>` o simili token speciali

### Metodo 2: Test Pratico

1. Abilita MCP in OllamaGUI
2. Seleziona il modello da testare
3. Chiedi: "Leggi il contenuto del file C:/test.txt" (con filesystem server attivo)
4. Se il modello genera una tool call, supporta function calling

### Metodo 3: Documentazione Ollama

Visita la pagina del modello su [ollama.ai/library](https://ollama.ai/library) e verifica se menziona "function calling" o "tool use" nelle capabilities.

---

## Configurazione MCP in OllamaGUI

### File di Configurazione

`app/data/mcp-config.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-filesystem", "/path/to/allow"],
      "enabled": true
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-github"],
      "env": { "GITHUB_TOKEN": "your-token" },
      "enabled": false
    }
  }
}
```

### Abilitare MCP nell'Interfaccia

1. Apri OllamaGUI
2. Clicca sull'icona ingranaggio nella sidebar destra
3. Nella sezione MCP, abilita i server desiderati con il toggle
4. Seleziona un modello compatibile dalla dropdown
5. Inizia a chattare - il modello user i tool quando necessario

### Indicatori Visivi

Durante la chat con MCP attivo vedrai:
- Badge "MCP Enhanced" sui messaggi che usano tools
- Indicatore "Executing tool..." durante l'esecuzione
- Risultato del tool con stato (success/error)

---

## Troubleshooting

### "Il modello non usa i tool MCP"

1. **Verifica compatibilit**: Il modello supporta function calling?
2. **Verifica configurazione**: I server MCP sono abilitati e connessi?
3. **Verifica prompt**: Prova un prompt pi esplicito come "Usa il tool filesystem per leggere..."

### "Tool call fallisce"

1. **Verifica server MCP**: Il server  avviato correttamente?
2. **Verifica permessi**: Il server ha accesso alle risorse richieste?
3. **Verifica API keys**: Per server come GitHub, le credenziali sono configurate?

### "Risposta lenta con MCP"

I modelli pi piccoli potrebbero impiegare pi tempo per generare tool calls corrette. Considera l'uso di un modello pi grande o disabilita MCP per conversazioni che non richiedono tools.

---

## Risorse Aggiuntive

- [Ollama Function Calling Documentation](https://ollama.ai/blog/tool-support)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Lista Server MCP Disponibili](https://github.com/modelcontextprotocol/servers)

---

*Ultimo aggiornamento: 13 Dicembre 2025*
*OllamaGUI v1.0.0*
