/**
 * MCPClient.js - Universal MCP Client for OllamaGUI
 * CommonJS version for compatibility with existing architecture
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const MCPConnection = require('./MCPConnection');
const logger = require('../core/logging/LoggingService');

class MCPClient extends EventEmitter {
    constructor(configPath = null) {
        super();

        // Map of active MCP servers (name -> connection)
        this.servers = new Map();

        // Map of all available tools (tool_name -> server_info)
        this.availableTools = new Map();

        // Configuration loaded from JSON file
        this.config = null;

        // Path to configuration file
        this.configPath = configPath || path.join(__dirname, '../../data', 'mcp-config.json');

        // Client state
        this.isInitialized = false;
        this.initializationPromise = null;
    }

    /**
     * Initialize MCP client by loading configuration and connecting to enabled servers
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        
        if (this.initializationPromise) {
            return await this.initializationPromise;
        }
        
        this.initializationPromise = this._performInitialization();
        
        try {
            await this.initializationPromise;
            this.isInitialized = true;
            this.emit('initialized');
        } catch (error) {
            this.initializationPromise = null;
            throw error;
        }
    }

    /**
     * Performs actual initialization
     */
    async _performInitialization() {
        console.log('[MCPClient] Initializing MCP client...');

        await this.loadConfiguration();
        await this.connectToEnabledServers();

        console.log(`[MCPClient] Initialization completed. ${this.servers.size} servers connected, ${this.availableTools.size} tools available`);
    }

    /**
     * Load configuration from mcp-config.json file
     */
    async loadConfiguration() {
        try {
            if (!fs.existsSync(this.configPath)) {
                console.warn(`[MCPClient] Configuration file not found: ${this.configPath}`);
                this.config = { mcpServers: {}, globalSettings: {} };
                return;
            }

            const configContent = fs.readFileSync(this.configPath, 'utf8');
            this.config = JSON.parse(configContent);

            console.log(`[MCPClient] Configuration loaded: ${Object.keys(this.config.mcpServers || {}).length} servers configured`);

        } catch (error) {
            console.error('[MCPClient] Error loading configuration:', error.message);
            logger.mcp('error', 'Error loading configuration', { error: error.message, configPath: this.configPath });
            this.config = { mcpServers: {}, globalSettings: {} };
        }
    }

    /**
     * Connect to all enabled MCP servers in configuration
     */
    async connectToEnabledServers() {
        const serverConfigs = this.config.mcpServers || {};
        const enabledServers = Object.entries(serverConfigs)
            .filter(([name, config]) => config.enabled !== false);

        if (enabledServers.length === 0) {
            console.log('[MCPClient] No MCP servers enabled');
            return;
        }

        console.log(`[MCPClient] Connecting to ${enabledServers.length} MCP servers...`);

        // Connect to servers in parallel for better performance
        const connectionPromises = enabledServers.map(([name, config]) =>
            this.connectToServer(name, config).catch(error => {
                console.error(`[MCPClient] Error connecting to server ${name}:`, error.message);
                logger.mcp('error', `Error connecting to server ${name}`, { server: name, error: error.message });
                return null;
            })
        );

        await Promise.allSettled(connectionPromises);
    }

    /**
     * Connect to a single MCP server
     */
    async connectToServer(serverName, serverConfig) {
        try {
            console.log(`[MCPClient] Connecting to server ${serverName}...`);

            // Create and initialize MCP connection
            const connection = new MCPConnection(serverName, serverConfig);

            // Execute MCP handshake
            await connection.initialize();

            // Discover server capabilities
            const capabilities = await connection.discoverCapabilities();

            // Register available tools
            this._registerServerCapabilities(serverName, capabilities);

            // Save active connection
            this.servers.set(serverName, connection);

            console.log(`[MCPClient] Server ${serverName} connected. Tools: ${capabilities.tools?.length || 0}`);

            this.emit('serverConnected', serverName, capabilities);

        } catch (error) {
            console.error(`[MCPClient] Error connecting to server ${serverName}:`, error.message);
            logger.mcp('error', `Failed to connect to server ${serverName}`, { server: serverName, error: error.message, config: serverConfig.command });
            throw error;
        }
    }

    /**
     * Register discovered server capabilities
     */
    _registerServerCapabilities(serverName, capabilities) {
        if (capabilities.tools) {
            capabilities.tools.forEach(tool => {
                this.availableTools.set(tool.name, {
                    server: serverName,
                    tool: tool,
                    description: tool.description || '',
                    inputSchema: tool.inputSchema || null
                });
            });
        }
    }

    /**
     * Execute a specific MCP tool
     */
    async callTool(toolName, parameters = {}) {
        await this.initialize();

        const toolInfo = this.availableTools.get(toolName);
        if (!toolInfo) {
            throw new Error(`Tool '${toolName}' not available. Available tools: ${Array.from(this.availableTools.keys()).join(', ')}`);
        }

        const connection = this.servers.get(toolInfo.server);
        if (!connection) {
            throw new Error(`Server '${toolInfo.server}' for tool '${toolName}' not connected`);
        }

        try {
            console.log(`[MCPClient] Executing tool ${toolName} on server ${toolInfo.server}`);
            const result = await connection.callTool(toolName, parameters);
            console.log(`[MCPClient] Tool ${toolName} completed`);
            return result;
        } catch (error) {
            console.error(`[MCPClient] Error executing tool ${toolName}:`, error.message);
            logger.mcp('error', `Tool execution failed: ${toolName}`, { tool: toolName, server: toolInfo.server, parameters, error: error.message });
            throw error;
        }
    }

    /**
     * Get list of all available tools for Ollama
     */
    getAvailableTools() {
        const tools = [];
        
        for (const [toolName, toolInfo] of this.availableTools) {
            tools.push({
                type: "function",
                function: {
                    name: toolName,
                    description: toolInfo.description,
                    parameters: toolInfo.inputSchema || { type: "object", properties: {} }
                }
            });
        }
        
        return tools;
    }

    /**
     * Get information about connected servers
     */
    getServerStatus() {
        return {
            connectedServers: Array.from(this.servers.keys()),
            totalTools: this.availableTools.size,
            isInitialized: this.isInitialized
        };
    }

    /**
     * Reload configuration and reconnect to servers
     */
    async reloadConfiguration() {
        console.log('[MCPClient] Reloading configuration...');
        
        await this.disconnect();
        
        this.isInitialized = false;
        this.initializationPromise = null;
        
        await this.initialize();
    }

    /**
     * Disconnect from all MCP servers
     */
    async disconnect() {
        console.log('[MCPClient] Disconnecting from all MCP servers...');

        for (const [serverName, connection] of this.servers) {
            try {
                await connection.disconnect();
                console.log(`[MCPClient] Disconnected from server ${serverName}`);
            } catch (error) {
                console.error(`[MCPClient] Error disconnecting from server ${serverName}:`, error.message);
                logger.mcp('error', `Error disconnecting from server ${serverName}`, { server: serverName, error: error.message });
            }
        }
        
        this.servers.clear();
        this.availableTools.clear();
        this.isInitialized = false;
        
        this.emit('disconnected');
    }
}

module.exports = MCPClient;