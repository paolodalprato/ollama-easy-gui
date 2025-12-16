/**
 * MCPController.js - Controller per l'integrazione MCP in OllamaGUI
 * CommonJS version per compatibilità con architettura esistente
 */

const MCPClient = require('../mcp/MCPClient');
const logger = require('../core/logging/LoggingService');

class MCPController {
    constructor() {
        // Istanza del client MCP (singleton pattern)
        this.mcpClient = null;
    }

    /**
     * Inizializza il client MCP se non già inizializzato
     */
    async getMCPClient() {
        if (!this.mcpClient) {
            this.mcpClient = new MCPClient();

            // Aggiungi listener per eventi importanti con logging
            this.mcpClient.on('initialized', () => {
                console.log('[MCPController] Client MCP inizializzato con successo');
                logger.mcp('info', 'Client MCP inizializzato con successo');
            });

            this.mcpClient.on('serverConnected', (serverName, capabilities) => {
                const toolCount = capabilities.tools?.length || 0;
                console.log(`[MCPController] Server ${serverName} connesso con ${toolCount} tools`);
                logger.mcp('info', `Server ${serverName} connesso`, { tools: toolCount });
            });

            this.mcpClient.on('disconnected', () => {
                console.log('[MCPController] Client MCP disconnesso');
                logger.mcp('info', 'Client MCP disconnesso');
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
                    message: status.isInitialized ? 'MCP attivo e funzionante' : 'MCP non inizializzato'
                }
            }));
            
        } catch (error) {
            console.error('[MCPController] Errore recupero status:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Errore recupero status MCP',
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
                    message: `${tools.length} tools MCP disponibili`
                }
            }));
            
        } catch (error) {
            console.error('[MCPController] Errore recupero tools:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Errore recupero tools MCP',
                details: error.message
            }));
        }
    }

    /**
     * POST /api/mcp/execute-tool
     */
    async executeTool(req, res) {
        try {
            // Leggi il body della richiesta
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
                            error: 'Nome tool richiesto'
                        }));
                        return;
                    }
                    
                    const client = await this.getMCPClient();
                    await client.initialize();

                    console.log(`[MCPController] Esecuzione tool: ${toolName}`);
                    logger.mcp('info', `Esecuzione tool: ${toolName}`, { parameters });

                    const result = await client.callTool(toolName, parameters || {});
                    logger.mcp('info', `Tool ${toolName} completato`, { success: true });
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        data: {
                            toolName: toolName,
                            result: result,
                            message: `Tool ${toolName} eseguito con successo`
                        }
                    }));
                    
                } catch (parseError) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Errore parsing richiesta',
                        details: parseError.message
                    }));
                }
            });
            
        } catch (error) {
            console.error(`[MCPController] Errore esecuzione tool:`, error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Errore esecuzione tool MCP',
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
                    message: 'Configurazione MCP ricaricata con successo'
                }
            }));
            
        } catch (error) {
            console.error('[MCPController] Errore ricarica configurazione:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Errore ricarica configurazione MCP',
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
                    message: `${servers.length} server configurati, ${status.connectedServers.length} connessi`
                }
            }));
            
        } catch (error) {
            console.error('[MCPController] Errore recupero server:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Errore recupero server MCP',
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
                    message: 'Test integrazione MCP completato',
                    availableTools: availableTools.length,
                    mcpStatus: client.getServerStatus()
                }
            }));
            
        } catch (error) {
            console.error('[MCPController] Errore test integrazione:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Errore test integrazione MCP',
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
                    message: 'Disconnesso da tutti i server MCP'
                }
            }));

        } catch (error) {
            console.error('[MCPController] Errore disconnessione:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Errore disconnessione MCP',
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
                        error: 'Nome server richiesto'
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
                        error: 'File configurazione MCP non trovato'
                    }));
                    return;
                }

                const configContent = fs.readFileSync(configPath, 'utf8');
                const configData = JSON.parse(configContent);

                if (!configData.mcpServers || !configData.mcpServers[serverName]) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: `Server '${serverName}' non trovato nella configurazione`
                    }));
                    return;
                }

                // Update enabled status
                configData.mcpServers[serverName].enabled = enabled;

                // Save updated config
                fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');

                console.log(`[MCPController] Server ${serverName} ${enabled ? 'abilitato' : 'disabilitato'}`);
                logger.mcp('info', `Server ${serverName} ${enabled ? 'abilitato' : 'disabilitato'}`);

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
                        message: `Server ${serverName} ${enabled ? 'abilitato' : 'disabilitato'} con successo`
                    }
                }));

            } catch (parseError) {
                console.error('[MCPController] Errore toggle server:', parseError.message);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: 'Errore parsing richiesta',
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
                    message: `${tools.length} tools pronti per Ollama`
                }
            }));

        } catch (error) {
            console.error('[MCPController] Errore recupero tools per Ollama:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Errore recupero tools MCP',
                details: error.message
            }));
        }
    }
}

module.exports = MCPController;