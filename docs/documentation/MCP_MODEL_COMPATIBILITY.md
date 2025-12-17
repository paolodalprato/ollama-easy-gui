# MCP Model Compatibility Guide

**Ollama Easy GUI - Model Context Protocol Integration**

This guide explains which Ollama models are compatible with MCP (Model Context Protocol) features.

---

## Requirements for MCP Usage

### What is Function Calling?

To use MCP tools (filesystem, GitHub, search, etc.), the AI model must support **"function calling"** (or "tool use"). This capability allows the model to:

1. **Recognize** when an external tool is needed to respond
2. **Generate** structured calls (JSON) with tool name and parameters
3. **Interpret** the results returned by the tool
4. **Continue** the conversation integrating the obtained information

Not all Ollama models have this capability - only those specifically trained for function calling.

---

## Compatible Models (Complete List)

### Tier 1: Excellent Support

| Model | Sizes | VRAM Required | Notes |
|-------|-------|---------------|-------|
| **llama3.1** | 8B, 70B, 405B | 6GB / 40GB / 200GB+ | Excellent native support |
| **llama3.3** | 70B | 40GB | Latest version, optimized |
| **qwen2.5** | 0.5B-72B | 1GB-45GB | Great for multilingual |
| **command-r-plus** | 104B | 65GB+ | Specialized for RAG and tools |
| **hermes3** | 8B, 70B | 6GB / 40GB | Fine-tuned for function calling |
| **firefunction-v2** | 70B | 40GB | Created specifically for tools |

### Tier 2: Good Support

| Model | Sizes | VRAM Required | Notes |
|-------|-------|---------------|-------|
| **llama3.2** | 1B, 3B | 2GB / 3GB | Lightweight but capable |
| **mistral** | 7B | 5GB | Fast and reliable |
| **mistral-nemo** | 12B | 8GB | Balanced |
| **mixtral** | 8x7B, 8x22B | 26GB / 85GB | MoE, great ratio |
| **qwen2** | 0.5B-72B | 1GB-45GB | Previous version |
| **command-r** | 35B | 22GB | Base version |

### Tier 3: Basic Support

| Model | Sizes | VRAM Required | Notes |
|-------|-------|---------------|-------|
| **qwen2.5-coder** | 1.5B-32B | 2GB-20GB | Code specialized |
| **nemotron** | 70B | 40GB | NVIDIA, good performance |
| **granite3-dense** | 2B, 8B | 2GB / 6GB | IBM, enterprise-ready |
| **granite3-moe** | 1B, 3B | 1GB / 3GB | IBM MoE lightweight |
| **smollm2** | 135M-1.7B | <2GB | Ultra-lightweight |

---

## Incompatible Models

The following models **do not support function calling** and **will not work with MCP**:

| Model | Reason |
|-------|--------|
| `llama2` (all variants) | Previous architecture without tool support |
| `codellama` | Specialized only for code, no tools |
| `phi` (v1, v2) | Microsoft models without tool training |
| `phi3` | Base versions without function calling |
| `gemma` (v1) | Google, first generation |
| `vicuna` | LLaMA1 fine-tune, obsolete |
| `orca` | Not trained for tools |
| `tinyllama` | Too small for tool use |
| `deepseek-v1` | Previous version |
| Embedding models | `nomic-embed`, `mxbai-embed`, etc. |

---

## Recommendations by Use Case

### For Consumer Hardware (8-16GB VRAM)

```
Recommended: llama3.1:8b or qwen2.5:7b
- Great balance of performance/resources
- Reliable function calling support
- Good response speed
```

### For Limited Hardware (4-8GB VRAM)

```
Recommended: llama3.2:3b or qwen2.5:3b
- Works with entry-level GPUs
- Basic but functional tool support
- Ideal for testing and development
```

### For Enterprise Hardware (32GB+ VRAM)

```
Recommended: llama3.3:70b or command-r-plus
- Maximum response quality
- Excellent context understanding
- Sophisticated tool use
```

### For Specific Tasks

| Task | Recommended Model |
|------|-------------------|
| Coding with MCP filesystem | `qwen2.5-coder:7b` |
| Document search | `command-r:35b` |
| Multilingual | `qwen2.5:7b` |
| Maximum speed | `llama3.2:3b` |
| Maximum quality | `llama3.3:70b` |

---

## How to Verify Compatibility

### Method 1: Check Template

```bash
ollama show <model-name> --modelfile
```

Look for references to:
- `tools`
- `tool_call`
- `function`
- `<|tool|>` or similar special tokens

### Method 2: Practical Test

1. Enable MCP in Ollama Easy GUI
2. Select the model to test
3. Ask: "Read the content of file C:/test.txt" (with filesystem server active)
4. If the model generates a tool call, it supports function calling

### Method 3: Ollama Documentation

Visit the model page on [ollama.ai/library](https://ollama.ai/library) and check if it mentions "function calling" or "tool use" in the capabilities.

---

## MCP Configuration in Ollama Easy GUI

### Configuration File

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

### Enabling MCP in the Interface

1. Open Ollama Easy GUI
2. Click the gear icon in the right sidebar
3. In the MCP section, enable desired servers with the toggle
4. Select a compatible model from the dropdown
5. Start chatting - the model will use tools when needed

### Visual Indicators

During chat with MCP enabled you'll see:
- "MCP Enhanced" badge on messages using tools
- "Executing tool..." indicator during execution
- Tool result with status (success/error)

---

## Troubleshooting

### "Model doesn't use MCP tools"

1. **Verify compatibility**: Does the model support function calling?
2. **Verify configuration**: Are MCP servers enabled and connected?
3. **Verify prompt**: Try a more explicit prompt like "Use the filesystem tool to read..."

### "Tool call fails"

1. **Verify MCP server**: Is the server started correctly?
2. **Verify permissions**: Does the server have access to requested resources?
3. **Verify API keys**: For servers like GitHub, are credentials configured?

### "Slow response with MCP"

Smaller models may take longer to generate correct tool calls. Consider using a larger model or disable MCP for conversations that don't require tools.

---

## Additional Resources

- [Ollama Function Calling Documentation](https://ollama.ai/blog/tool-support)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Available MCP Servers List](https://github.com/modelcontextprotocol/servers)

---

*Last updated: December 2025*
*Ollama Easy GUI v1.0.0*
