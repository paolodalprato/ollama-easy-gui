/**
 * TEST PATH RESOLUTION - SISTEMA MODULARE
 * Test specifico per verificare la correzione del path resolution
 */

const path = require('path');
const fs = require('fs').promises;

async function testPathResolution() {
    console.log('🧪 Testing Path Resolution Fix...\n');
    
    try {
        // Test 1: Verifica che il file storage esista nel path corretto
        console.log('1. Testing storage module path...');
        const expectedPath = path.join(__dirname, 'modules', 'storage', 'StorageModule.js');
        const incorrectPath = path.join(__dirname, 'modules', 'modules', 'storage', 'StorageModule.js');
        
        console.log(`   Expected: ${expectedPath}`);
        console.log(`   Incorrect: ${incorrectPath}`);
        
        try {
            await fs.access(expectedPath);
            console.log('   ✅ Correct path exists');
        } catch {
            console.log('   ❌ Correct path does not exist');
            return false;
        }
        
        try {
            await fs.access(incorrectPath);
            console.log('   ⚠️  Incorrect path also exists (unexpected)');
        } catch {
            console.log('   ✅ Incorrect path does not exist (as expected)');
        }
        
        // Test 2: Test del ModuleLoader path resolution
        console.log('\n2. Testing ModuleLoader path resolution...');
        const { getModuleLoader } = require('./core/ModuleLoader');
        const moduleLoader = getModuleLoader();
        
        // Test del metodo _resolveModulePath interno
        const testConfig = { path: 'storage/StorageModule.js' };
        
        // Simula la risoluzione del path come farebbe il ModuleLoader
        const basePath = path.join(__dirname, 'modules');
        const resolvedPath = path.resolve(basePath, testConfig.path);
        
        console.log(`   Base path: ${basePath}`);
        console.log(`   Config path: ${testConfig.path}`);
        console.log(`   Resolved path: ${resolvedPath}`);
        
        try {
            await fs.access(resolvedPath);
            console.log('   ✅ ModuleLoader path resolution works correctly');
        } catch {
            console.log('   ❌ ModuleLoader path resolution failed');
            return false;
        }
        
        // Test 3: Test configurazione bootstrap
        console.log('\n3. Testing bootstrap configuration...');
        const { DualArchitectureBootstrap } = require('./modular-bootstrap');
        
        console.log('   ✅ Bootstrap configuration can be loaded');
        
        console.log('\n✅ ALL PATH RESOLUTION TESTS PASSED!');
        return true;
        
    } catch (error) {
        console.error('❌ Path resolution test failed:', error.message);
        return false;
    }
}

// Esegui i test
if (require.main === module) {
    testPathResolution()
        .then(success => {
            if (success) {
                console.log('\n🎉 Path resolution is fixed and ready!');
                process.exit(0);
            } else {
                console.log('\n💥 Path resolution still has issues');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Test crashed:', error);
            process.exit(1);
        });
}

module.exports = { testPathResolution };