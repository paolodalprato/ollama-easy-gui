/**
 * MCPConnection.js - Manages a single connection to an MCP server
 *
 * Uses the official MCP SDK (@modelcontextprotocol/sdk) to ensure
 * compatibility with all standard MCP servers.
 */

const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const logger = require('../core/logging/LoggingService');

class MCPConnection extends EventEmitter {
    constructor(serverName, serverConfig) {
        super();

        this.serverName = serverName;
        this.serverConfig = serverConfig;
        this.client = null;
        this.transport = null;
        this.isInitialized = false;

        // Default timeout for requests
        this.requestTimeout = 30000; // 30 seconds
    }

    /**
     * Initialize connection: starts server process and performs handshake
     */
    async initialize() {
        try {
            console.log(`[MCPConnection:${this.serverName}] Initializing connection with MCP SDK...`);

            // Determine if shell mode is needed on Windows
            const isWindows = process.platform === 'win32';
            const needsShell = isWindows && (
                this.serverConfig.command === 'npx' ||
                this.serverConfig.command === 'npm' ||
                this.serverConfig.command.endsWith('.cmd') ||
                this.serverConfig.command.endsWith('.bat')
            );

            // Create stdio transport using MCP SDK
            this.transport = new StdioClientTransport({
                command: this.serverConfig.command,
                args: this.serverConfig.args || [],
                env: {
                    ...process.env,
                    ...this.serverConfig.env
                },
                // On Windows with npx/npm shell mode is needed
                ...(needsShell && { shell: true })
            });

            console.log(`[MCPConnection:${this.serverName}] Starting: ${this.serverConfig.command} ${(this.serverConfig.args || []).join(' ')}${needsShell ? ' (shell mode)' : ''}`);

            // Create MCP client
            this.client = new Client({
                name: "Ollama Easy GUI",
                version: "1.0.0"
            }, {
                capabilities: {
                    roots: {
                        listChanged: true
                    }
                }
            });

            // Handle close events
            this.transport.onclose = () => {
                console.log(`[MCPConnection:${this.serverName}] Transport closed`);
                this.isInitialized = false;
                this.emit('processExit', 0, null);
            };

            this.transport.onerror = (error) => {
                console.error(`[MCPConnection:${this.serverName}] Transport error:`, error.message);
                logger.mcp('error', `Transport error on ${this.serverName}`, { server: this.serverName, error: error.message });
                this.emit('processError', error);
            };

            // Connect client to transport (this does handshake automatically)
            console.log(`[MCPConnection:${this.serverName}] Connecting to server...`);
            await this.client.connect(this.transport);

            this.isInitialized = true;
            console.log(`[MCPConnection:${this.serverName}] ✅ Connection established with MCP SDK`);

        } catch (error) {
            console.error(`[MCPConnection:${this.serverName}] Initialization error:`, error.message);
            logger.mcp('error', `Initialization failed for ${this.serverName}`, { server: this.serverName, command: this.serverConfig.command, error: error.message });
            throw error;
        }
    }

    /**
     * Discover server capabilities (tools, resources, prompts)
     */
    async discoverCapabilities() {
        const capabilities = {
            tools: [],
            resources: [],
            prompts: []
        };

        try {
            console.log(`[MCPConnection:${this.serverName}] Discovering server capabilities...`);

            // Get available tools list
            try {
                const toolsResult = await this.client.listTools();
                capabilities.tools = toolsResult.tools || [];
                console.log(`[MCPConnection:${this.serverName}] ✅ Found ${capabilities.tools.length} tools`);
            } catch (error) {
                console.warn(`[MCPConnection:${this.serverName}] No tools available:`, error.message);
            }

            // Get resources list (optional)
            try {
                const resourcesResult = await this.client.listResources();
                capabilities.resources = resourcesResult.resources || [];
                console.log(`[MCPConnection:${this.serverName}] Found ${capabilities.resources.length} resources`);
            } catch (error) {
                // Resources are optional
            }

            // Get prompts list (optional)
            try {
                const promptsResult = await this.client.listPrompts();
                capabilities.prompts = promptsResult.prompts || [];
                console.log(`[MCPConnection:${this.serverName}] Found ${capabilities.prompts.length} prompts`);
            } catch (error) {
                // Prompts are optional
            }

        } catch (error) {
            console.error(`[MCPConnection:${this.serverName}] Error discovering capabilities:`, error.message);
            logger.mcp('error', `Failed to discover capabilities for ${this.serverName}`, { server: this.serverName, error: error.message });
            throw error;
        }

        return capabilities;
    }

    /**
     * Execute a specific tool on the MCP server
     */
    async callTool(toolName, parameters) {
        if (!this.isInitialized || !this.client) {
            throw new Error(`Server ${this.serverName} not initialized`);
        }

        try {
            console.log(`[MCPConnection:${this.serverName}] Calling tool: ${toolName}`);

            const result = await this.client.callTool({
                name: toolName,
                arguments: parameters || {}
            });

            console.log(`[MCPConnection:${this.serverName}] ✅ Tool ${toolName} executed successfully`);
            return result;

        } catch (error) {
            console.error(`[MCPConnection:${this.serverName}] Error executing tool ${toolName}:`, error.message);
            logger.mcp('error', `Tool execution error: ${toolName}`, { server: this.serverName, tool: toolName, parameters, error: error.message });
            throw error;
        }
    }

    /**
     * Read a resource from the MCP server
     */
    async readResource(uri) {
        if (!this.isInitialized || !this.client) {
            throw new Error(`Server ${this.serverName} not initialized`);
        }

        try {
            console.log(`[MCPConnection:${this.serverName}] Reading resource: ${uri}`);

            const result = await this.client.readResource({ uri });
            return result;

        } catch (error) {
            console.error(`[MCPConnection:${this.serverName}] Error reading resource ${uri}:`, error.message);
            logger.mcp('error', `Resource read error: ${uri}`, { server: this.serverName, uri, error: error.message });
            throw error;
        }
    }

    /**
     * Check if connection is active
     */
    isConnected() {
        return this.isInitialized && this.client !== null;
    }

    /**
     * Disconnect from MCP server
     */
    async disconnect() {
        try {
            console.log(`[MCPConnection:${this.serverName}] Disconnecting...`);

            if (this.client) {
                await this.client.close();
                this.client = null;
            }

            if (this.transport) {
                await this.transport.close();
                this.transport = null;
            }

            this.isInitialized = false;
            console.log(`[MCPConnection:${this.serverName}] ✅ Disconnected`);

        } catch (error) {
            console.error(`[MCPConnection:${this.serverName}] Disconnection error:`, error.message);
            logger.mcp('error', `Disconnection error for ${this.serverName}`, { server: this.serverName, error: error.message });
        }
    }
}

module.exports = MCPConnection;
