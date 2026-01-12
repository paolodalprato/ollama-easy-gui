/**
 * OllamaDownloadManager - Model download and progress tracking
 *
 * Handles:
 * - Model download with progress tracking
 * - Progress parsing from ollama pull output
 * - Download state management
 *
 * @module OllamaDownloadManager
 */
const { spawn } = require('child_process');

/**
 * @typedef {Object} DownloadProgress
 * @property {boolean} active - Whether a download is in progress
 * @property {string|null} modelName - Name of model being downloaded
 * @property {number} percentage - Download progress (0-100)
 * @property {string} status - Current status
 * @property {string} details - Human-readable status message
 * @property {string} downloadedSize - Downloaded size
 * @property {string} totalSize - Total size
 * @property {number|null} startTime - Download start timestamp
 */

class OllamaDownloadManager {
    constructor() {
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
    }

    /**
     * Download a model from Ollama Hub with progress tracking
     * @param {string} modelName - Name of the model to download
     * @param {Function} healthCheck - Function to check if Ollama is running
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    async downloadModel(modelName, healthCheck) {
        try {
            console.log(`📥 Starting download for model: ${modelName}`);

            // Verify Ollama is running
            const isRunning = await healthCheck();
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
     * @private
     */
    _parseDownloadProgress(output) {
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
     * Reset download progress state
     */
    resetProgress() {
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
    }
}

module.exports = OllamaDownloadManager;
