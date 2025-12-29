/**
 * OllamaManager - Core Ollama process and model management
 *
 * Handles all interactions with the Ollama runtime:
 * - Process lifecycle (start, stop, health checks)
 * - Model management (list, download, remove)
 * - Download progress tracking with real-time updates
 *
 * @module OllamaManager
 * @requires child_process
 */
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} OllamaStatus
 * @property {boolean} isRunning - Whether Ollama server is running
 * @property {string|null} version - Ollama version string
 * @property {string|null} modelsPath - Custom models directory path
 * @property {Date} lastCheck - Timestamp of last health check
 */

/**
 * @typedef {Object} DownloadProgress
 * @property {boolean} active - Whether a download is in progress
 * @property {string|null} modelName - Name of model being downloaded
 * @property {number} percentage - Download progress (0-100)
 * @property {string} status - Current status ('idle'|'pulling'|'downloading'|'verifying'|'finalizing'|'completed'|'error')
 * @property {string} details - Human-readable status message
 * @property {string} downloadedSize - Downloaded size (e.g., "1.8 GB")
 * @property {string} totalSize - Total size (e.g., "4.1 GB")
 * @property {number|null} startTime - Download start timestamp
 */

class OllamaManager {
    /**
     * Create an OllamaManager instance
     * Initializes status tracking and download progress state
     */
    constructor() {
        /** @type {OllamaStatus} */
        this.status = {
            isRunning: false,
            version: null,
            modelsPath: process.env.OLLAMA_MODELS || null,
            lastCheck: new Date()
        };

        /** @type {ChildProcess|null} */
        this.ollamaProcess = null;

        /** @type {Function[]} */
        this.statusCallbacks = [];

        /** @type {DownloadProgress} */
        this.downloadProgress = {
            active: false,
            modelName: null,
            percentage: 0,
            status: 'idle',
            details: '',
            downloadedSize: '',
            totalSize: '',
            startTime: null
        };

        console.log('🔧 OllamaManager initialized - minimal stable version');
        console.log('🚀 Streaming always active (like official Ollama)');
    }

    // === OLLAMA PROCESS MANAGEMENT ===

    /**
     * Start the Ollama server process
     * Checks if already running, verifies installation, then spawns the server
     * @returns {Promise<boolean>} True if started successfully or already running
     */
    async startOllama() {
        try {
            console.log('🔍 Starting Ollama with minimal stability...');
            
            // Check if already running
            const isAlreadyRunning = await this.checkOllamaHealth();
            if (isAlreadyRunning) {
                console.log('✅ Ollama already running');
                return true;
            }

            // Verify installation
            const isInstalled = await this.checkOllamaInstallation();
            if (!isInstalled) {
                console.log('❌ Ollama not installed');
                return false;
            }

            // Start Ollama process
            const args = ['serve'];
            console.log('🚀 Starting Ollama server (streaming always enabled in API calls)');
            console.log('🔧 Server args:', args);
            
            this.ollamaProcess = spawn('ollama', args, {
                detached: false,
                stdio: 'ignore' // IGNORE STDIO COMPLETELY - MAIN FIX
            });

            // Process event handling - MINIMAL
            this.ollamaProcess.on('error', (error) => {
                console.log(`❌ Ollama process error: ${error.message}`);
                this.status.isRunning = false;
            });

            this.ollamaProcess.on('exit', (code) => {
                console.log(`🔄 Ollama process exited with code: ${code}`);
                this.status.isRunning = false;
                this.ollamaProcess = null;
            });

            // Wait for startup with simple verification
            await this.waitForStartup();
            
            console.log('✅ Ollama started successfully');
            return true;

        } catch (error) {
            console.error('❌ Error starting Ollama:', error.message);
            return false;
        }
    }

    /**
     * Wait for Ollama server to become healthy after startup
     * Polls health endpoint with retries
     * @returns {Promise<boolean>} True if server became healthy
     * @throws {Error} If server fails to start after max attempts
     * @private
     */
    async waitForStartup() {
        const maxAttempts = 6;
        const waitMs = 1500;
        
        console.log('⏳ Starting minimal startup verification...');
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`🔄 Verification attempt ${attempt}/${maxAttempts} (waiting ${waitMs}ms)...`);
            
            await new Promise(resolve => setTimeout(resolve, waitMs));
            
            const isHealthy = await this.checkOllamaHealth();
            if (isHealthy) {
                console.log('✅ Ollama startup verified successfully');
                this.status.isRunning = true;
                return true;
            }
        }
        
        throw new Error('Ollama failed to start after verification attempts');
    }

    // === HEALTH CHECK ===

    /**
     * Check if Ollama server is healthy and responding
     * Updates internal status with version and running state
     * @returns {Promise<boolean>} True if server is healthy
     */
    async checkOllamaHealth() {
        try {
            const response = await fetch('http://127.0.0.1:11434/api/version', {
                method: 'GET',
                timeout: 2000
            });
            
            if (response.ok) {
                const data = await response.json();
                this.status.version = data.version;
                this.status.isRunning = true;
                this.status.lastCheck = new Date();
                return true;
            }
            return false;
            
        } catch (error) {
            this.status.isRunning = false;
            return false;
        }
    }

    // === INSTALLATION VERIFICATION ===

    /**
     * Verify Ollama is installed on the system
     * @returns {Promise<boolean>} True if ollama command is available
     */
    async checkOllamaInstallation() {
        return new Promise((resolve) => {
            exec('ollama --version', (error, stdout) => {
                if (error) {
                    resolve(false);
                } else {
                    console.log('✅ Ollama installation verified');
                    resolve(true);
                }
            });
        });
    }

    // === STATUS API ===

    /**
     * Get current Ollama status
     * Performs health check and returns status object
     * @returns {Promise<{isRunning: boolean, version: string|null, lastCheck: Date}>}
     */
    async getStatus() {
        await this.checkOllamaHealth();
        return {
            isRunning: this.status.isRunning,
            version: this.status.version,
            lastCheck: this.status.lastCheck
        };
    }

    /**
     * Stop the Ollama server process
     * Handles both managed process and standalone Ollama instances
     * Platform-aware: uses taskkill on Windows, pkill on Unix
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    async stopOllama() {
        try {
            console.log('🛑 Attempting to stop Ollama...');
            
            // If we have a reference to the process, try to terminate it
            if (this.ollamaProcess) {
                console.log('🔄 Killing managed Ollama process...');
                this.ollamaProcess.kill('SIGTERM');
                this.ollamaProcess = null;
            }
            
            // On Windows, Ollama often runs as a standalone process
            // Try to terminate all ollama processes
            if (process.platform === 'win32') {
                console.log('💻 Windows detected - attempting to kill ollama.exe processes...');
                const { spawn } = require('child_process');
                
                return new Promise((resolve) => {
                    // First, kill ollama.exe
                    const killOllamaExe = spawn('taskkill', ['/F', '/IM', 'ollama.exe'], {
                        windowsHide: true,
                        stdio: 'pipe'
                    });
                    
                    killOllamaExe.on('close', (code1) => {
                        console.log(`🔄 ollama.exe termination result: ${code1}`);
                        
                        // Then, kill "ollama app.exe" (with space in name)
                        const killOllamaApp = spawn('taskkill', ['/F', '/FI', 'IMAGENAME eq ollama*'], {
                            windowsHide: true,
                            stdio: 'pipe'
                        });
                        
                        killOllamaApp.on('close', (code2) => {
                            console.log(`🔄 ollama app.exe termination result: ${code2}`);
                            
                            if (code1 === 0 || code2 === 0) {
                                console.log('✅ Ollama processes terminated successfully');
                                this.status.isRunning = false;
                                resolve({ success: true, message: 'Ollama stopped successfully' });
                            } else {
                                console.log('⚠️ No Ollama processes found to terminate');
                                this.status.isRunning = false;
                                resolve({ success: true, message: 'No Ollama processes were running' });
                            }
                        });
                        
                        killOllamaApp.on('error', (error) => {
                            console.error('❌ Error killing ollama app processes:', error);
                            // Still resolve with first command result
                            this.status.isRunning = false;
                            resolve({ success: true, message: 'Partial Ollama stop completed' });
                        });
                    });
                    
                    killOllamaExe.on('error', (error) => {
                        console.error('❌ Error killing ollama.exe processes:', error);
                        resolve({ success: false, error: error.message });
                    });
                });
            } else {
                // On Linux/Mac, try pkill
                console.log('🐧 Unix-like system detected - attempting pkill...');
                const { spawn } = require('child_process');
                
                return new Promise((resolve) => {
                    const killProcess = spawn('pkill', ['-f', 'ollama'], {
                        stdio: 'pipe'
                    });
                    
                    killProcess.on('close', (code) => {
                        console.log('✅ Ollama stop attempt completed');
                        this.status.isRunning = false;
                        resolve({ success: true, message: 'Ollama stopped' });
                    });
                    
                    killProcess.on('error', (error) => {
                        console.error('❌ Error killing processes:', error);
                        resolve({ success: false, error: error.message });
                    });
                });
            }
            
        } catch (error) {
            console.error('❌ Error stopping Ollama:', error);
            return { success: false, error: error.message };
        }
    }

    // === MODEL MANAGEMENT ===

    /**
     * Remove a model from local storage
     * Executes `ollama rm <modelName>` command
     * @param {string} modelName - Name of the model to remove
     * @returns {Promise<{success: boolean, message?: string, error?: string, output?: string, warnings?: string}>}
     */
    async removeModel(modelName) {
        try {
            console.log(`🗑️ Attempting to remove model: ${modelName}`);

            // Verify Ollama is running
            const isRunning = await this.checkOllamaHealth();
            if (!isRunning) {
                return {
                    success: false,
                    error: 'Ollama is not running. Start Ollama first.'
                };
            }
            
            // Execute removal command
            const { exec } = require('child_process');
            
            return new Promise((resolve) => {
                const command = `ollama rm "${modelName}"`;
                console.log(`🔧 Executing: ${command}`);
                
                exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`❌ Remove model error:`, error.message);
                        console.error(`❌ Stderr:`, stderr);
                        resolve({
                            success: false,
                            error: `Failed to remove model: ${error.message}`,
                            details: stderr
                        });
                        return;
                    }
                    
                    console.log(`✅ Model removal output:`, stdout);
                    if (stderr) {
                        console.log(`📋 Model removal stderr:`, stderr);
                    }
                    
                    // Consider success if there are no critical errors
                    const success = !stderr.includes('error') && !stdout.includes('error');
                    
                    resolve({
                        success: true,
                        message: `Model ${modelName} removed successfully`,
                        output: stdout,
                        warnings: stderr || null
                    });
                });
            });
            
        } catch (error) {
            console.error('❌ Error in removeModel:', error);
            return {
                success: false,
                error: `Remove model failed: ${error.message}`
            };
        }
    }
    
    /**
     * Download a model from Ollama Hub with progress tracking
     * @param {string} modelName - Name of the model to download
     */
    async downloadModel(modelName) {
        try {
            console.log(`📥 Starting download for model: ${modelName}`);

            // Verify Ollama is running
            const isRunning = await this.checkOllamaHealth();
            if (!isRunning) {
                return {
                    success: false,
                    error: 'Ollama is not running. Start Ollama first.'
                };
            }

            // Check if already downloading
            if (this.downloadProgress.active) {
                return {
                    success: false,
                    error: `Already downloading ${this.downloadProgress.modelName}. Please wait.`
                };
            }

            // Initialize progress tracking
            this.downloadProgress = {
                active: true,
                modelName: modelName,
                percentage: 0,
                status: 'starting',
                details: 'Initializing download...',
                downloadedSize: '',
                totalSize: '',
                startTime: Date.now()
            };

            return new Promise((resolve) => {
                console.log(`🔧 Spawning: ollama pull "${modelName}"`);

                const pullProcess = spawn('ollama', ['pull', modelName], {
                    windowsHide: true
                });

                let lastOutput = '';

                // Parse progress from stderr (ollama outputs progress to stderr)
                pullProcess.stderr.on('data', (data) => {
                    const output = data.toString();
                    lastOutput = output;
                    this._parseDownloadProgress(output);
                });

                pullProcess.stdout.on('data', (data) => {
                    const output = data.toString();
                    lastOutput = output;
                    this._parseDownloadProgress(output);
                });

                pullProcess.on('close', (code) => {
                    console.log(`📥 Download process exited with code: ${code}`);

                    if (code === 0) {
                        this.downloadProgress = {
                            active: false,
                            modelName: modelName,
                            percentage: 100,
                            status: 'completed',
                            details: 'Download completed!',
                            downloadedSize: '',
                            totalSize: '',
                            startTime: null
                        };

                        resolve({
                            success: true,
                            message: `Model ${modelName} downloaded successfully`
                        });
                    } else {
                        this.downloadProgress = {
                            active: false,
                            modelName: modelName,
                            percentage: 0,
                            status: 'error',
                            details: `Error during download (code: ${code})`,
                            downloadedSize: '',
                            totalSize: '',
                            startTime: null
                        };

                        resolve({
                            success: false,
                            error: `Download failed with code ${code}`,
                            details: lastOutput
                        });
                    }
                });

                pullProcess.on('error', (error) => {
                    console.error(`❌ Download spawn error:`, error.message);

                    this.downloadProgress = {
                        active: false,
                        modelName: modelName,
                        percentage: 0,
                        status: 'error',
                        details: error.message,
                        downloadedSize: '',
                        totalSize: '',
                        startTime: null
                    };

                    resolve({
                        success: false,
                        error: `Download failed: ${error.message}`
                    });
                });
            });

        } catch (error) {
            console.error('❌ Error in downloadModel:', error);

            this.downloadProgress = {
                active: false,
                modelName: modelName,
                percentage: 0,
                status: 'error',
                details: error.message,
                downloadedSize: '',
                totalSize: '',
                startTime: null
            };

            return {
                success: false,
                error: `Download model failed: ${error.message}`
            };
        }
    }

    /**
     * Parse download progress from ollama pull output
     * @param {string} output - Output line from ollama pull
     */
    _parseDownloadProgress(output) {
        // Example outputs:
        // "pulling manifest"
        // "pulling abc123...  45% ▕███████        ▏ 1.8 GB/4.1 GB"
        // "verifying sha256 digest"
        // "writing manifest"
        // "success"

        const line = output.trim();
        if (!line) return;

        console.log(`📥 Download output: ${line}`);

        // Check for percentage pattern: "45%" or "100%"
        const percentMatch = line.match(/(\d+)%/);
        if (percentMatch) {
            this.downloadProgress.percentage = parseInt(percentMatch[1], 10);
        }

        // Check for size pattern: "1.8 GB/4.1 GB" or "500 MB/2.1 GB"
        const sizeMatch = line.match(/([\d.]+\s*[KMGT]?B)\s*\/\s*([\d.]+\s*[KMGT]?B)/i);
        if (sizeMatch) {
            this.downloadProgress.downloadedSize = sizeMatch[1];
            this.downloadProgress.totalSize = sizeMatch[2];
        }

        // Update status based on content
        if (line.includes('pulling manifest')) {
            this.downloadProgress.status = 'pulling';
            this.downloadProgress.details = 'Fetching manifest...';
        } else if (line.includes('pulling')) {
            this.downloadProgress.status = 'downloading';
            if (this.downloadProgress.downloadedSize && this.downloadProgress.totalSize) {
                this.downloadProgress.details = `${this.downloadProgress.downloadedSize} / ${this.downloadProgress.totalSize}`;
            } else {
                this.downloadProgress.details = 'Download in progress...';
            }
        } else if (line.includes('verifying')) {
            this.downloadProgress.status = 'verifying';
            this.downloadProgress.details = 'Verifying integrity...';
            this.downloadProgress.percentage = 95;
        } else if (line.includes('writing manifest')) {
            this.downloadProgress.status = 'finalizing';
            this.downloadProgress.details = 'Writing manifest...';
            this.downloadProgress.percentage = 98;
        } else if (line.includes('success')) {
            this.downloadProgress.status = 'completed';
            this.downloadProgress.details = 'Download completed!';
            this.downloadProgress.percentage = 100;
        }
    }

    /**
     * Check download progress for polling
     * @returns {Object} Current download progress state
     */
    checkDownloadProgress() {
        return {
            success: true,
            ...this.downloadProgress
        };
    }

    /**
     * Get list of locally installed models
     * Fetches from Ollama API /api/tags endpoint
     * @returns {Promise<{success: boolean, data: Object[], error?: string}>}
     */
    async getLocalModels() {
        try {
            console.log('📦 Getting local models via API...');

            const response = await fetch('http://127.0.0.1:11434/api/tags', {
                method: 'GET',
                timeout: 10000
            });

            if (!response.ok) {
                throw new Error(`API responded with status ${response.status}`);
            }

            const data = await response.json();

            return {
                success: true,
                data: data.models || []
            };

        } catch (error) {
            console.error('❌ Error getting local models:', error);
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    /**
     * Alias for getLocalModels (backward compatibility)
     * @returns {Promise<{success: boolean, data: Object[], error?: string}>}
     */
    async listLocalModels() {
        return await this.getLocalModels();
    }

    // === MONITORING (disabled) ===

    /**
     * Start monitoring (no-op, UI indicator is sufficient)
     * @deprecated Monitoring disabled in minimal version
     */
    startMonitoring() {
        console.log('🔍 Monitoring disabled - UI indicator is sufficient');
    }

    /**
     * Stop monitoring (no-op)
     * @deprecated Monitoring disabled in minimal version
     */
    stopMonitoring() {
        // No-op
    }

    // === CALLBACK SYSTEM ===

    /**
     * Register a callback for status changes
     * @param {Function} callback - Function to call on status change (status, message, details)
     */
    onStatusChange(callback) {
        this.statusCallbacks.push(callback);
    }

    /**
     * Notify all registered callbacks of a status change
     * @param {string} status - Status identifier
     * @param {string} message - Human-readable message
     * @param {Object} details - Additional details object
     * @private
     */
    notifyStatusChange(status, message, details = {}) {
        this.statusCallbacks.forEach(callback => {
            try {
                callback(status, message, details);
            } catch (error) {
                console.error('Error in status callback:', error);
            }
        });
    }

    /**
     * Alias for startOllama (backward compatibility)
     * Used by server.js and HealthController.js
     * @returns {Promise<boolean>} True if started successfully
     */
    async startOllamaServer() {
        return await this.startOllama();
    }
}

module.exports = OllamaManager;