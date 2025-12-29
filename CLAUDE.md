# Ollama Easy GUI

Chat interface for Ollama with MCP support, global system prompts, and privacy-first design.

## Stack

- **Language**: JavaScript (Node.js 16+)
- **Backend**: Pure Node.js HTTP server (no Express)
- **Frontend**: Vanilla JavaScript (no frameworks)
- **Styling**: Material Design 3 inspired, modular CSS
- **Storage**: Local JSON files
- **Dependencies**: Minimal (`@modelcontextprotocol/sdk`, `pdf-parse`)

## Structure

```
ollama-easy-gui/
├── app/
│   ├── backend/
│   │   ├── server.js              # Entry point, routing, security middleware
│   │   ├── controllers/           # API controllers (9 total)
│   │   │   ├── ChatController.js
│   │   │   ├── ModelController.js
│   │   │   ├── OllamaController.js
│   │   │   ├── MCPController.js
│   │   │   ├── LogController.js
│   │   │   ├── AttachmentController.js
│   │   │   ├── HealthController.js
│   │   │   ├── ProxyController.js
│   │   │   └── SystemPromptController.js
│   │   ├── core/
│   │   │   ├── ollama/            # OllamaManager, HubSearcher
│   │   │   ├── storage/           # ChatStorage
│   │   │   └── logging/           # LoggingService
│   │   ├── mcp/                   # MCPClient, MCPConnection
│   │   ├── security/              # SecurityValidator (enabled)
│   │   ├── config/                # OllamaConfig (centralized constants)
│   │   └── utils/                 # HttpResponse, RequestParser utilities
│   ├── frontend/
│   │   ├── index.html             # Single-page application
│   │   ├── css/                   # 15 modular CSS files
│   │   │   ├── core/              # design-tokens.css
│   │   │   ├── layout/            # main-layout.css
│   │   │   ├── components/        # chat, modals, buttons, etc.
│   │   │   └── utils/             # responsive, accessibility
│   │   └── js/
│   │       ├── app.js             # Main orchestrator
│   │       ├── components/        # UI components
│   │       │   ├── ChatInterface.js
│   │       │   ├── ModelManager.js
│   │       │   ├── MCPManager.js
│   │       │   └── ...
│   │       ├── managers/          # State managers
│   │       │   ├── ChatManager.js
│   │       │   ├── FileManager.js
│   │       │   └── ...
│   │       ├── services/          # API, storage services
│   │       │   ├── ApiClient.js
│   │       │   └── StorageService.js
│   │       └── utils/             # Utilities
│   │           ├── DOMUtils.js
│   │           ├── FileUtils.js
│   │           └── ...
│   └── data/                      # Local storage
│       ├── conversations/         # Chat history (JSON)
│       ├── logs/                  # Application logs
│       └── config/                # User configuration
├── docs/                          # Documentation
├── icon/                          # UI icons (PNG)
└── RESERVED/                      # Tests, obsolete docs
```

## Conventions

### Backend
- Controllers handle HTTP request/response
- Core modules contain business logic
- Route patterns: `/api/{resource}/{action}`
- Logging via `LoggingService` (app, chat, mcp, models categories)

### Frontend
- Class-based components (`ChatInterface`, `ModelManager`, etc.)
- Global `app` instance exposed via `window.app`
- Event delegation through `DOMUtils.addClickListener()`
- Notifications via `NotificationSystem`

### Naming
- Files: PascalCase for classes (`ChatManager.js`), kebab-case for CSS
- CSS: BEM-inspired (`sidebar-left`, `chat-interface`)
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE

### API Patterns
- JSON responses: `{ success: boolean, data?, error? }`
- Streaming: Server-Sent Events for chat, model downloads
- CORS enabled for localhost development

## Review Focus

### Critical Areas
- `server.js`: Route registration, static file serving
- `OllamaController.js`: Chat streaming, MCP tool execution
- `MCPClient.js`/`MCPConnection.js`: External tool integration
- `ChatStorage.js`: Data persistence, message history
- `app.js`: Frontend orchestration, component initialization

### Security Considerations
- `SecurityValidator.js` - enabled, provides:
  - Request validation and rate limiting (localhost exempt, 500 req/min for remote)
  - Input length validation (URL: 2048, message: 100KB)
  - File upload validation (50MB limit, whitelist MIME types)
  - XSS prevention via input sanitization
  - Path traversal protection
- XSS protection in chat rendering (`formatMessage()` escapes HTML entities)
- MCP tool execution sandboxing
- File attachment validation
- Path traversal prevention in static file serving

### Performance
- Model loading/unloading via Ollama API
- Streaming response handling
- SSE connection management

## New Utilities (2025-12-29)

### Backend Utilities (`app/backend/utils/`)
- **HttpResponse.js**: Centralized HTTP response handling
  - `HttpResponse.success(res, data)` - JSON success response
  - `HttpResponse.error(res, message, statusCode)` - JSON error response
  - `HttpResponse.sseHeaders(res)` / `HttpResponse.sseEvent(res, event, data)` - SSE helpers
- **RequestParser.js**: Request body parsing
  - `RequestParser.parseJSON(req)` - Promise-based JSON body parsing
  - `RequestParser.parseRaw(req)` - Raw body for multipart/binary
  - `RequestParser.extractParam(url, basePath)` - URL parameter extraction

### Configuration (`app/backend/config/`)
- **OllamaConfig.js**: Centralized Ollama settings
  - Connection: `HOST`, `PORT`, `BASE_URL` (env overridable)
  - Timeouts: `TIMEOUTS.HEALTH_CHECK`, `TIMEOUTS.MODEL_LOAD_*`
  - `getTimeoutForModel(name)` - Calculate timeout based on model name
  - `getTimeoutForSize(sizeGB)` - Calculate timeout based on model size

## Environment Variables
- `OLLAMA_HOST` - Ollama server host (default: localhost)
- `OLLAMA_PORT` - Ollama server port (default: 11434)
- `OLLAMA_MODELS` - Custom models directory path

## Recent Changes (2025-12-29)

### Security Fixes
- **XSS Prevention**: Fixed critical XSS vulnerability in `ChatInterface.js` and `MessageStreamManager.js` where HTML tags in AI responses were rendered as actual HTML (e.g., `<script>` tags would execute)
- **Rate Limiting**: Updated `SecurityValidator.js` to exempt localhost connections from rate limiting (was causing shutdown issues)
- **SecurityValidator Re-enabled**: Was previously commented out, now active in `server.js`

### Code Cleanup
- Removed dead code:
  - `_generatePDF()` method from `ChatController.js` (never called)
  - `ModelManager.js` from backend (unused wrapper)
  - Unused aliases from `OllamaManager.js` (`autoStartOllama`, `getOllamaStatus`, etc.)
  - ~100 lines of unused CSS classes from `legacy-compatibility.css`
- Standardized `MCPController.js` comments (Italian → English)
- Removed hardcoded Ollama path, now uses `OLLAMA_MODELS` env variable

---
*Updated 2025-12-29 by code-review.*
