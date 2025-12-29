/**
 * MCPController.js - Controller for MCP integration in OllamaGUI
 * CommonJS version for compatibility with existing architecture
 */

const MCPClient = require('../mcp/MCPClient');
const logger = require('../core/logging/LoggingService');

class MCPController {
    constructor() {
        // MCP client instance (singleton pattern)
        this.mcpClient = null;
    }

    /**
     * Initialize MCP client if not already initialized
     */
    async getMCPClient() {
        if (!this.mcpClient) {
            this.mcpClient = new MCPClient();

            // Add listeners for important events with logging
            this.mcpClient.on('initialized', () => {
                console.log('[MCPController] MCP client initialized successfully');
                logger.mcp('info', 'MCP client initialized successfully');
            });

            this.mcpClient.on('serverConnected', (serverName, capabilities) => {
                const toolCount = capabilities.tools?.length || 0;
                console.log(`[MCPController] Server ${serverName} connected with ${toolCount} tools`);
                logger.mcp('info', `Server ${serverName} connected`, { tools: toolCount });
            });

            this.mcpClient.on('disconnected', () => {
                console.log('[MCPController] MCP client disconnected');
                logger.mcp('info', 'MCP client disconnected');
            });
        }

        return this.mcpClient;
    }

    /**
     * GET /api/mcp/status
     */
    async getStatus(req, res) {
        try {
            const client = await this.getMCPClient();
            await client.initialize();
            
            const status = client.getServerStatus();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: {
                    ...status,
                    message: status.isInitialized ? 'MCP active and working' : 'MCP not initialized'
                }
            }));

        } catch (error) {
            console.error('[MCPController] Error retrieving status:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Error retrieving MCP status',
                details: error.message
            }));
        }
    }

    /**
     * GET /api/mcp/tools
     */
    async getAvailableTools(req, res) {
        try {
            const client = await this.getMCPClient();
            await client.initialize();
            
            const tools = client.getAvailableTools();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: {
                    tools: tools,
                    count: tools.length,
                    message: `${tools.length} MCP tools available`
                }
            }));

        } catch (error) {
            console.error('[MCPController] Error retrieving tools:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Error retrieving MCP tools',
                details: error.message
            }));
        }
    }

    /**
     * POST /api/mcp/execute-tool
     */
    async executeTool(req, res) {
        try {
            // Read request body
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', async () => {
                try {
                    const { toolName, parameters } = JSON.parse(body);

                    if (!toolName) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: false,
                            error: 'Tool name required'
                        }));
                        return;
                    }

                    const client = await this.getMCPClient();
                    await client.initialize();

                    console.log(`[MCPController] Executing tool: ${toolName}`);
                    logger.mcp('info', `Executing tool: ${toolName}`, { parameters });

                    const result = await client.callTool(toolName, parameters || {});
                    logger.mcp('info', `Tool ${toolName} completed`, { success: true });

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        data: {
                            toolName: toolName,
                            result: result,
                            message: `Tool ${toolName} executed successfully`
                        }
                    }));

                } catch (parseError) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Request parsing error',
                        details: parseError.message
                    }));
                }
            });

        } catch (error) {
            console.error(`[MCPController] Tool execution error:`, error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'MCP tool execution error',
                details: error.message
            }));
        }
    }

    /**
     * POST /api/mcp/reload-config
     */
    async reloadConfiguration(req, res) {
        try {
            const client = await this.getMCPClient();
            await client.reloadConfiguration();
            
            const status = client.getServerStatus();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: {
                    ...status,
                    message: 'MCP configuration reloaded successfully'
                }
            }));

        } catch (error) {
            console.error('[MCPController] Error reloading configuration:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Error reloading MCP configuration',
                details: error.message
            }));
        }
    }

    /**
     * GET /api/mcp/servers
     */
    async getServers(req, res) {
        try {
            const client = await this.getMCPClient();
            await client.initialize();
            
            const fs = require('fs');
            const path = require('path');
            
            const configPath = path.join(__dirname, '../../data', 'mcp-config.json');
            let configData = { mcpServers: {} };
            
            if (fs.existsSync(configPath)) {
                const configContent = fs.readFileSync(configPath, 'utf8');
                configData = JSON.parse(configContent);
            }
            
            const status = client.getServerStatus();
            const servers = [];
            
            for (const [serverName, serverConfig] of Object.entries(configData.mcpServers || {})) {
                servers.push({
                    name: serverName,
                    description: serverConfig.description || '',
                    enabled: serverConfig.enabled !== false,
                    connected: status.connectedServers.includes(serverName),
                    command: serverConfig.command,
                    args: serverConfig.args
                });
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: {
                    servers: servers,
                    totalConfigured: servers.length,
                    totalConnected: status.connectedServers.length,
                    message: `${servers.length} servers configured, ${status.connectedServers.length} connected`
                }
            }));

        } catch (error) {
            console.error('[MCPController] Error retrieving servers:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Error retrieving MCP servers',
                details: error.message
            }));
        }
    }

    /**
     * POST /api/mcp/test-integration
     */
    async testIntegration(req, res) {
        try {
            const client = await this.getMCPClient();
            await client.initialize();
            
            const availableTools = client.getAvailableTools();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: {
                    message: 'MCP integration test completed',
                    availableTools: availableTools.length,
                    mcpStatus: client.getServerStatus()
                }
            }));

        } catch (error) {
            console.error('[MCPController] Integration test error:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'MCP integration test error',
                details: error.message
            }));
        }
    }

    /**
     * DELETE /api/mcp/disconnect
     */
    async disconnect(req, res) {
        try {
            if (this.mcpClient) {
                await this.mcpClient.disconnect();
                this.mcpClient = null;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: {
                    message: 'Disconnected from all MCP servers'
                }
            }));

        } catch (error) {
            console.error('[MCPController] Disconnection error:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'MCP disconnection error',
                details: error.message
            }));
        }
    }

    /**
     * POST /api/mcp/toggle-server
     * Enable/disable a specific MCP server
     */
    async toggleServer(req, res) {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const { serverName, enabled } = JSON.parse(body);

                if (!serverName) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Server name required'
                    }));
                    return;
                }

                const fs = require('fs');
                const path = require('path');

                const configPath = path.join(__dirname, '../../data', 'mcp-config.json');

                if (!fs.existsSync(configPath)) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: 'MCP configuration file not found'
                    }));
                    return;
                }

                const configContent = fs.readFileSync(configPath, 'utf8');
                const configData = JSON.parse(configContent);

                if (!configData.mcpServers || !configData.mcpServers[serverName]) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: `Server '${serverName}' not found in configuration`
                    }));
                    return;
                }

                // Update enabled status
                configData.mcpServers[serverName].enabled = enabled;

                // Save updated config
                fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');

                console.log(`[MCPController] Server ${serverName} ${enabled ? 'enabled' : 'disabled'}`);
                logger.mcp('info', `Server ${serverName} ${enabled ? 'enabled' : 'disabled'}`);

                // Reload MCP configuration to apply changes
                const client = await this.getMCPClient();
                await client.reloadConfiguration();

                const status = client.getServerStatus();

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    data: {
                        serverName: serverName,
                        enabled: enabled,
                        connectedServers: status.connectedServers,
                        message: `Server ${serverName} ${enabled ? 'enabled' : 'disabled'} successfully`
                    }
                }));

            } catch (parseError) {
                console.error('[MCPController] Server toggle error:', parseError.message);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: 'Request parsing error',
                    details: parseError.message
                }));
            }
        });
    }

    /**
     * GET /api/mcp/tools-for-ollama
     * Get tools formatted for Ollama function calling
     */
    async getToolsForOllama(req, res) {
        try {
            const client = await this.getMCPClient();
            await client.initialize();

            const tools = client.getAvailableTools();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: {
                    tools: tools,
                    count: tools.length,
                    format: 'ollama',
                    message: `${tools.length} tools ready for Ollama`
                }
            }));

        } catch (error) {
            console.error('[MCPController] Error retrieving tools for Ollama:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Error retrieving MCP tools',
                details: error.message
            }));
        }
    }
}

module.exports = MCPController;