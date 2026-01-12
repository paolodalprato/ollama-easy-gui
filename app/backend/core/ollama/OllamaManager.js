/**
 * OllamaManager - Core Ollama process and model management
 *
 * Handles all interactions with the Ollama runtime:
 * - Process lifecycle (start, stop, health checks)
 * - Model management (list, remove)
 * - Download delegation to OllamaDownloadManager
 *
 * @module OllamaManager
 */
const { spawn, exec } = require('child_process');
const OllamaDownloadManager = require('./OllamaDownloadManager');

/**
 * @typedef {Object} OllamaStatus
 * @property {boolean} isRunning - Whether Ollama server is running
 * @property {string|null} version - Ollama version string
 * @property {string|null} modelsPath - Custom models directory path
 * @property {Date} lastCheck - Timestamp of last health check
 */

class OllamaManager {
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

        // Delegate download management
        this.downloadManager = new OllamaDownloadManager();

        console.log('🔧 OllamaManager initialized');
    }

    // === OLLAMA PROCESS MANAGEMENT ===

    /**
     * Start the Ollama server process
     * @returns {Promise<boolean>} True if started successfully or already running
     */
    async startOllama() {
        try {
            console.log('🔍 Starting Ollama...');

            const isAlreadyRunning = await this.checkOllamaHealth();
            if (isAlreadyRunning) {
                console.log('✅ Ollama already running');
                return true;
            }

            const isInstalled = await this.checkOllamaInstallation();
            if (!isInstalled) {
                console.log('❌ Ollama not installed');
                return false;
            }

            const args = ['serve'];
            console.log('🚀 Starting Ollama server');

            this.ollamaProcess = spawn('ollama', args, {
                detached: false,
                stdio: 'ignore'
            });

            this.ollamaProcess.on('error', (error) => {
                console.log(`❌ Ollama process error: ${error.message}`);
                this.status.isRunning = false;
            });

            this.ollamaProcess.on('exit', (code) => {
                console.log(`🔄 Ollama process exited with code: ${code}`);
                this.status.isRunning = false;
                this.ollamaProcess = null;
            });

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
     * @private
     */
    async waitForStartup() {
        const maxAttempts = 6;
        const waitMs = 1500;

        console.log('⏳ Waiting for Ollama startup...');

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`🔄 Verification attempt ${attempt}/${maxAttempts}...`);

            await new Promise(resolve => setTimeout(resolve, waitMs));

            const isHealthy = await this.checkOllamaHealth();
            if (isHealthy) {
                console.log('✅ Ollama startup verified');
                this.status.isRunning = true;
                return true;
            }
        }

        throw new Error('Ollama failed to start after verification attempts');
    }

    // === HEALTH CHECK ===

    /**
     * Check if Ollama server is healthy
     * @returns {Promise<boolean>}
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
     * @returns {Promise<boolean>}
     */
    async checkOllamaInstallation() {
        return new Promise((resolve) => {
            exec('ollama --version', (error) => {
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
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    async stopOllama() {
        try {
            console.log('🛑 Stopping Ollama...');

            if (this.ollamaProcess) {
                console.log('🔄 Killing managed Ollama process...');
                this.ollamaProcess.kill('SIGTERM');
                this.ollamaProcess = null;
            }

            if (process.platform === 'win32') {
                return this._stopOllamaWindows();
            } else {
                return this._stopOllamaUnix();
            }

        } catch (error) {
            console.error('❌ Error stopping Ollama:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Stop Ollama on Windows
     * @private
     */
    async _stopOllamaWindows() {
        console.log('💻 Windows - killing ollama.exe processes...');

        return new Promise((resolve) => {
            const killOllamaExe = spawn('taskkill', ['/F', '/IM', 'ollama.exe'], {
                windowsHide: true,
                stdio: 'pipe'
            });

            killOllamaExe.on('close', (code1) => {
                const killOllamaApp = spawn('taskkill', ['/F', '/FI', 'IMAGENAME eq ollama*'], {
                    windowsHide: true,
                    stdio: 'pipe'
                });

                killOllamaApp.on('close', (code2) => {
                    this.status.isRunning = false;
                    if (code1 === 0 || code2 === 0) {
                        resolve({ success: true, message: 'Ollama stopped successfully' });
                    } else {
                        resolve({ success: true, message: 'No Ollama processes were running' });
                    }
                });

                killOllamaApp.on('error', () => {
                    this.status.isRunning = false;
                    resolve({ success: true, message: 'Partial Ollama stop completed' });
                });
            });

            killOllamaExe.on('error', (error) => {
                resolve({ success: false, error: error.message });
            });
        });
    }

    /**
     * Stop Ollama on Unix
     * @private
     */
    async _stopOllamaUnix() {
        console.log('🐧 Unix - pkill ollama...');

        return new Promise((resolve) => {
            const killProcess = spawn('pkill', ['-f', 'ollama'], {
                stdio: 'pipe'
            });

            killProcess.on('close', () => {
                this.status.isRunning = false;
                resolve({ success: true, message: 'Ollama stopped' });
            });

            killProcess.on('error', (error) => {
                resolve({ success: false, error: error.message });
            });
        });
    }

    // === MODEL MANAGEMENT ===

    /**
     * Remove a model from local storage
     * @param {string} modelName - Name of the model to remove
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    async removeModel(modelName) {
        try {
            console.log(`🗑️ Removing model: ${modelName}`);

            const isRunning = await this.checkOllamaHealth();
            if (!isRunning) {
                return {
                    success: false,
                    error: 'Ollama is not running. Start Ollama first.'
                };
            }

            return new Promise((resolve) => {
                const command = `ollama rm "${modelName}"`;
                console.log(`🔧 Executing: ${command}`);

                exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`❌ Remove model error:`, error.message);
                        resolve({
                            success: false,
                            error: `Failed to remove model: ${error.message}`,
                            details: stderr
                        });
                        return;
                    }

                    console.log(`✅ Model removal output:`, stdout);

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
     * Download a model (delegated to OllamaDownloadManager)
     * @param {string} modelName - Name of the model to download
     */
    async downloadModel(modelName) {
        return this.downloadManager.downloadModel(
            modelName,
            () => this.checkOllamaHealth()
        );
    }

    /**
     * Check download progress (delegated)
     * @returns {Object} Current download progress state
     */
    checkDownloadProgress() {
        return this.downloadManager.checkDownloadProgress();
    }

    /**
     * Get download progress (alias for backwards compatibility)
     */
    get downloadProgress() {
        return this.downloadManager.downloadProgress;
    }

    /**
     * Get list of locally installed models
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
     * Alias for getLocalModels
     */
    async listLocalModels() {
        return await this.getLocalModels();
    }

    // === MONITORING (disabled) ===

    startMonitoring() {
        console.log('🔍 Monitoring disabled');
    }

    stopMonitoring() {
        // No-op
    }

    // === CALLBACK SYSTEM ===

    onStatusChange(callback) {
        this.statusCallbacks.push(callback);
    }

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
     */
    async startOllamaServer() {
        return await this.startOllama();
    }
}

module.exports = OllamaManager;
