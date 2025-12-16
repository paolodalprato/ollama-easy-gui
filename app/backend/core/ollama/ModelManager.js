// ModelManager - Local Models Management Module
class ModelManager {
    constructor() {
        this.ollamaManager = null;
    }

    setOllamaManager(ollamaManager) {
        this.ollamaManager = ollamaManager;
    }

    async getLocalModels() {
        if (!this.ollamaManager) {
            return { success: false, error: 'OllamaManager not initialized' };
        }
        return await this.ollamaManager.listLocalModels();
    }

    async removeModel(modelName) {
        if (!this.ollamaManager) {
            return { success: false, error: 'OllamaManager not initialized' };
        }
        return await this.ollamaManager.removeModel(modelName);
    }
}

module.exports = ModelManager;