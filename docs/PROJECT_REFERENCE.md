# PROJECT REFERENCE - OLLAMA EASY GUI

**Software Version**: 1.0.0
**Last Updated**: December 15, 2025
**Repository**: https://github.com/paolodalprato/ollama-easy-gui
**Status**: Feature complete - Ready for GitHub

---

## 1. PROJECT OVERVIEW

### What is Ollama Easy GUI
Professional Chat Interface for Ollama AI Models - Local GUI, privacy-first, with advanced features not found in other GUIs (LM Studio, Ollama Web UI).

### Key Differentiators
- **MCP Support**: Model Context Protocol integration (like Claude Desktop) - UNIQUE in Ollama ecosystem
- **Web Search**: Web search integrated in AI responses (DuckDuckGo)
- **Hub Search**: Search and download models directly from GUI
- **Material Design 3**: Professional and accessible UI
- **Zero Dependencies**: Vanilla JS, no frameworks

### Technology Stack
- **Backend**: Node.js 22+ (native HTTP, no Express)
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript
- **Storage**: File-system JSON (privacy-first)
- **Dependencies**: Only `pdf-parse` for PDF attachments, `@modelcontextprotocol/sdk` for MCP

---

## 2. CURRENT STATUS

### Feature Complete (100%)
| Feature | Status | Notes |
|---------|--------|-------|
| Multi-model chat | ✅ | Streaming, context management |
| Base prompts | ✅ | Per-model, persistent |
| Conversation management | ✅ | CRUD, export MD/PDF/Word |
| Attachments | ✅ | PDF, DOCX, images, text |
| Local model management | ✅ | List, info, remove |
| Material Design 3 UI | ✅ | 12 modular CSS modules |
| Ollama auto-start | ✅ | Detection and lifecycle |
| Hub Ollama Search | ✅ | Search and download models |
| Web Search | ✅ | DuckDuckGo integration |
| MCP Integration | ✅ | Full tool support |

### Current Performance
- **Boot Time**: 12ms
- **API Response**: <100ms
- **Memory**: Stable, no leaks

---

## 3. ARCHITECTURE

### Directory Structure
```
ollama-easy-gui/
├── app/
│   ├── backend/
│   │   ├── server.js              # Entry point (411 lines)
│   │   ├── controllers/           # 9 controllers
│   │   │   ├── ChatController.js
│   │   │   ├── ModelController.js
│   │   │   ├── OllamaController.js
│   │   │   ├── AttachmentController.js
│   │   │   ├── MCPController.js      # MCP API
│   │   │   ├── WebSearchController.js # Web Search API
│   │   │   ├── SystemPromptController.js
│   │   │   ├── ProxyController.js
│   │   │   └── HealthController.js
│   │   ├── core/
│   │   │   ├── ollama/
│   │   │   │   ├── OllamaManager.js
│   │   │   │   ├── ModelManager.js
│   │   │   │   └── HubSearcher.js    # Hub search backend
│   │   │   └── storage/
│   │   │       └── ChatStorage.js
│   │   ├── mcp/
│   │   │   ├── MCPClient.js          # MCP client
│   │   │   └── MCPConnection.js      # JSON-RPC stdio
│   │   └── security/
│   │       └── SecurityValidator.js
│   ├── frontend/
│   │   ├── index.html             # 270 lines
│   │   ├── css/                   # 15 modular files
│   │   │   ├── main.css           # Orchestrator
│   │   │   ├── core/              # Design tokens
│   │   │   ├── layout/            # Layout
│   │   │   ├── components/        # 8 components
│   │   │   └── utils/             # Responsive, accessibility
│   │   └── js/
│   │       ├── app.js             # Main (~450 lines)
│   │       ├── components/        # 12 components
│   │       │   ├── ChatInterface.js
│   │       │   ├── ModelManager.js
│   │       │   ├── ModelHubSearch.js   # Hub search UI
│   │       │   ├── MCPManager.js       # MCP UI
│   │       │   ├── SearchInterface.js  # Web search UI
│   │       │   └── ...
│   │       ├── managers/          # 4 managers
│   │       ├── services/          # ApiClient, StorageService
│   │       └── utils/             # Utility modules
│   └── data/                      # Local storage
│       ├── conversations/         # Saved chats
│       ├── mcp-config.json        # MCP config
│       └── *.json                 # Other configs
├── docs/                          # Documentation
└── *.bat                          # Startup scripts
```

---

## 4. KEY FILE REFERENCES

### Backend
| File | Lines | Responsibility |
|------|-------|----------------|
| `server.js` | 411 | Entry point, routing |
| `ChatController.js` | ~1000 | Chat CRUD, streaming |
| `MCPController.js` | 305 | MCP API |
| `WebSearchController.js` | 263 | Web search API |
| `MCPClient.js` | 257 | MCP client |
| `HubSearcher.js` | 376 | Hub search |

### Frontend
| File | Lines | Responsibility |
|------|-------|----------------|
| `app.js` | ~450 | Orchestrator |
| `ChatInterface.js` | ~400 | Chat UI |
| `ModelHubSearch.js` | 227 | Hub search UI |
| `MCPManager.js` | 339 | MCP UI |
| `SearchInterface.js` | 356 | Web search UI |

---

## 5. TECHNICAL NOTES

### MCP Configuration (`app/data/mcp-config.json`)
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-filesystem", "D:/"],
      "enabled": true
    },
    "search1api": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-search1api"],
      "env": { "SEARCH1API_KEY": "${SEARCH1API_KEY}" },
      "enabled": false
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-github"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" },
      "enabled": false
    }
  }
}
```

### Ollama Function Calling Format
```javascript
// Request
{
  model: "llama3.2",
  messages: [...],
  tools: [{
    type: "function",
    function: {
      name: "read_file",
      description: "Read contents of a file",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path" }
        },
        required: ["path"]
      }
    }
  }]
}

// Response with tool call
{
  message: {
    role: "assistant",
    tool_calls: [{
      function: {
        name: "read_file",
        arguments: { path: "/some/file.txt" }
      }
    }]
  }
}
```

### Web Search Pipeline
```
1. User: "What are the latest news about X?"
2. SearchInterface.reformulateQuery() → "X latest news 2024"
3. WebSearchController.search() → DuckDuckGo results
4. SearchInterface.analyzeResults() → AI summary
5. Include summary in Ollama context
6. Ollama generates informed response
```

---

## 6. MCP COMPATIBLE MODELS (FUNCTION CALLING)

### Fundamental Requirement
To use MCP tools during conversations, **the Ollama model must support "function calling"**. Not all models have this capability.

### Compatible Models (Partial List)

| Model | Variants | Notes |
|-------|----------|-------|
| **llama3.1** | 8b, 70b, 405b | Excellent function calling support |
| **llama3.2** | 1b, 3b | Basic support, 3b recommended |
| **llama3.3** | 70b | Excellent for complex tasks |
| **mistral** | 7b | Good support |
| **mistral-nemo** | 12b | Advanced support |
| **mixtral** | 8x7b, 8x22b | MoE with good support |
| **qwen2** | 0.5b-72b | All variants support tools |
| **qwen2.5** | 0.5b-72b | Improved over qwen2 |
| **qwen2.5-coder** | 1.5b-32b | Optimized for code |
| **command-r** | 35b | Native RAG and tools |
| **command-r-plus** | 104b | Advanced version |
| **hermes3** | 8b, 70b | Fine-tuned for function calling |
| **firefunction-v2** | 70b | Specialized function calling |

### NOT Compatible Models
These models **do not support function calling** and will not work with MCP:
- `llama2` (all variants)
- `codellama`
- `phi` (v1, v2)
- `gemma` (v1)
- `vicuna`, `orca`

### Recommendations
1. **General MCP use**: `llama3.1:8b` or `qwen2.5:7b`
2. **Limited hardware**: `llama3.2:3b` or `qwen2.5:3b`
3. **Complex tasks**: `llama3.3:70b` or `command-r-plus`
4. **Code tasks**: `qwen2.5-coder:7b`

### Verify Compatibility
```bash
ollama show <model-name> --modelfile
```
Look for references to "tools", "function", or "tool_call" in the template.

---

## 7. VERSIONING STRATEGY (SEMANTIC VERSIONING)

### Adopted Standard
Ollama Easy GUI follows **Semantic Versioning 2.0.0** (SemVer).

**Format: MAJOR.MINOR.PATCH** (e.g., 1.2.3)

### Increment Rules

| Type | When | Example |
|------|------|---------|
| **PATCH** (1.0.X) | Bug fixes, minor corrections, performance improvements without behavior change | 1.0.0 → 1.0.1 |
| **MINOR** (1.X.0) | New backward-compatible features, UI improvements, new APIs that don't break existing ones | 1.0.1 → 1.1.0 |
| **MAJOR** (X.0.0) | Breaking changes, architectural redesigns, incompatible API modifications | 1.5.0 → 2.0.0 |

### Version History

| Version | Date | Type | Description |
|---------|------|------|-------------|
| 1.0.0 | Dec 15, 2025 | Initial | First public release - Feature complete, UI and code in English |

### References
- [Semantic Versioning 2.0.0](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)

---

## 8. RELATED DOCUMENTATION

- **[REFACTORING_HISTORY.md](./REFACTORING_HISTORY.md)** - Complete history of the refactoring phases (0-8B)
- **[CHANGELOG.md](../CHANGELOG.md)** - Version changelog
- **[README.md](../README.md)** - Quick start guide

---

*Document last updated: December 15, 2025*
