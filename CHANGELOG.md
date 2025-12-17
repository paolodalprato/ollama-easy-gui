# Changelog

All notable changes to Ollama Easy GUI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-14

### Initial Public Release

**Ollama Easy GUI** is a chat interface for Ollama AI models,
designed with a privacy-first approach where all data stays on your local machine.

### Features

#### Core Chat System
- Multi-model chat support with real-time streaming (SSE)
- Conversation management (create, edit, delete, export)
- System prompts per-model with persistence
- Attachment support (PDF, DOCX, images, text files)
- Message export in multiple formats (Markdown, TXT, Word)
- Auto-save conversations locally

#### MCP (Model Context Protocol) Support
- Full integration with MCP servers for tool execution
- Connect to filesystem, search, GitHub and other MCP servers
- Tool calls executed automatically during conversations
- UI indicators for tool execution status and results
- Enable/disable individual MCP servers from the interface
- Explicit MCP toggle in sidebar - tools only sent to model when enabled

#### Global System Prompt
- Universal instructions applied to ALL models
- Accessible from the header "Global Prompt" button
- Perfect for language preferences, response format, accuracy requirements
- Combines seamlessly with per-model base prompts

#### Ollama Hub Search
- Search and download models directly from the GUI
- Tab-based interface (Local Models / Hub Search)
- Category filters (Chat, Code, Reasoning, Multimodal)
- Download progress tracking with real-time updates

#### Model Management
- Local model management (list, info, remove)
- Auto-start Ollama with lifecycle management
- Dynamic timeout based on model size
- Model info display with parameters and size

#### User Interface
- Material Design 3 inspired UI
- 15 modular CSS files for maintainability
- Responsive layout for different screen sizes
- Collapsible sidebars with reopen buttons
- Dark mode support in components
- Drag & drop file attachments
- Full English UI for international users

### Technical Details
- Pure Node.js HTTP server (no Express dependency)
- Vanilla JavaScript frontend (no frameworks)
- File-system JSON storage for complete privacy
- Single dependency: `pdf-parse` for PDF attachments
- Cross-platform support (Windows, macOS, Linux)
