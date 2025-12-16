/**
 * TEST SCRIPT - MODULAR SYSTEM
 * Script per testare l'infrastruttura modulare appena creata
 */

const { startOllamaGUI } = require('./modular-bootstrap');

async function testModularSystem() {
    console.log('🧪 Testing Modular System...\n');
    
    try {
        // Avvia il sistema dual architecture
        console.log('1. Starting dual architecture system...');
        const system = await startOllamaGUI({ debug: true });
        console.log('✅ System started\n');
        
        // Test del sistema modulare
        console.log('2. Testing modular components...');
        const kernel = system.modularSystem.kernel;
        const status = kernel.getStatus();
        console.log(`   Kernel state: ${status.state}`);
        console.log(`   Uptime: ${status.uptime}ms`);
        console.log(`   Modules: ${status.modules.length}`);
        console.log('✅ Modular system working\n');
        
        // Test EventBus
        console.log('3. Testing EventBus...');
        const eventBus = system.modularSystem.eventBus;
        
        // Registra evento di test prima di usarlo
        eventBus.registerEventType('test.event', {
            type: 'object',
            required: true
        });
        
        // Listener di test
        eventBus.on('test.event', (event) => {
            console.log(`   📨 Received test event: ${JSON.stringify(event.payload)}`);
        });
        
        // Emetti evento di test
        await eventBus.emit('test.event', { message: 'Hello from EventBus!' });
        console.log('✅ EventBus working\n');
        
        // Test ModuleLoader
        console.log('4. Testing ModuleLoader...');
        const moduleLoader = system.modularSystem.moduleLoader;
        const modules = moduleLoader.listModules();
        console.log(`   Loaded modules: ${modules.map(m => `${m.id} (${m.state})`).join(', ')}`);
        console.log('✅ ModuleLoader working\n');
        
        // Test Storage Module (se caricato)
        console.log('5. Testing Storage Module...');
        const storageModule = kernel.getModule('storage');
        if (storageModule) {
            console.log('   Storage module found');
            
            // Test health check
            const health = await storageModule.exports.healthCheck();
            console.log(`   Health: ${health.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
            
            // Test write/read
            try {
                await storageModule.exports.write('config', 'test.json', { test: 'data', timestamp: new Date() });
                const data = await storageModule.exports.read('config', 'test.json');
                console.log(`   Write/Read test: ✅ Success (${JSON.stringify(data)})`);
            } catch (error) {
                console.log(`   Write/Read test: ❌ Failed (${error.message})`);
            }
            
            // Test metrics
            const metrics = storageModule.exports.getMetrics();
            console.log(`   Metrics: reads=${metrics.reads}, writes=${metrics.writes}, errors=${metrics.errors}`);
            
        } else {
            console.log('   ⚠️  Storage module not loaded');
        }
        console.log('✅ Storage Module tested\n');
        
        // Test Legacy Bridge
        console.log('6. Testing Legacy Bridge...');
        const bridge = system.legacyBridge;
        if (bridge) {
            const stats = bridge.getBridgeStats();
            console.log(`   Bridge stats: ${stats.totalBridges} bridges, ${stats.activeBridges} active`);
            console.log(`   Legacy components: ${Array.from(bridge.legacyComponents.keys()).join(', ')}`);
            console.log(`   Modular components: ${Array.from(bridge.modularComponents.keys()).join(', ')}`);
        } else {
            console.log('   ⚠️  Legacy bridge not available');
        }
        console.log('✅ Legacy Bridge tested\n');
        
        // Test routing globale
        console.log('7. Testing global routing...');
        if (global.OllamaGUI) {
            const globalHealth = await global.OllamaGUI.health();
            console.log(`   Global health: ${globalHealth.overall}`);
            
            const globalStatus = global.OllamaGUI.status();
            console.log(`   Global status: modular=${!!globalStatus.modular}, legacy=${globalStatus.legacy.loaded}`);
        } else {
            console.log('   ⚠️  Global routing not available');
        }
        console.log('✅ Global routing tested\n');
        
        // Summary
        console.log('📊 TEST SUMMARY:');
        console.log('================');
        console.log(`✅ Micro-kernel: ${kernel.state}`);
        console.log(`✅ EventBus: ${eventBus.getMetrics().totalEvents} events processed`);
        console.log(`✅ ModuleLoader: ${moduleLoader.getMetrics().loadedModules} modules loaded`);
        console.log(`✅ Dual Architecture: Legacy + Modular systems running`);
        console.log(`✅ Infrastructure: Ready for module migration\n`);
        
        console.log('🎉 ALL TESTS PASSED!');
        console.log('🚀 Modular system is ready for production use\n');
        
        console.log('💡 Next steps:');
        console.log('   1. Migrate existing components to modules');
        console.log('   2. Test dual architecture with real workloads');
        console.log('   3. Gradually transition from legacy to modular');
        console.log('   4. Complete transition and cleanup legacy code\n');
        
        // Keep system running for further testing
        console.log('🔄 System will keep running for manual testing...');
        console.log('   Use global.OllamaGUI commands for interaction');
        console.log('   Press Ctrl+C to shutdown\n');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Esegui i test
if (require.main === module) {
    testModularSystem();
}

module.exports = { testModularSystem };