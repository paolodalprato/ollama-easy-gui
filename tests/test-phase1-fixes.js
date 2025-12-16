/**
 * TEST FASE 1 FIXES - EVENTI CRITICI
 * Test specifico per verificare che i fix della Fase 1 funzionino
 */

async function testPhase1EventFixes() {
    console.log('🧪 Testing Phase 1 Event Fixes...\n');
    
    try {
        // Test 1: Verifica registrazione eventi critici
        console.log('1. Testing critical event registration...');
        const { getEventBus } = require('./core/EventBus');
        const eventBus = getEventBus();
        
        const criticalEvents = [
            'module.error',
            'module.started', 
            'module.stopped',
            'storage.error',
            'storage.written',
            'storage.deleted',
            'system.legacy.deprecated',
            'system.transition.completed'
        ];
        
        let registrationSuccess = true;
        for (const eventType of criticalEvents) {
            if (!eventBus.eventTypes.has(eventType)) {
                console.log(`   ❌ Event not registered: ${eventType}`);
                registrationSuccess = false;
            } else {
                console.log(`   ✅ Event registered: ${eventType}`);
            }
        }
        
        if (!registrationSuccess) {
            return false;
        }
        
        // Test 2: Test emissione eventi
        console.log('\n2. Testing event emission...');
        
        // Test module.error
        let eventReceived = false;
        eventBus.on('module.error', (event) => {
            eventReceived = true;
            console.log(`   📨 Received: ${event.type}`);
        });
        
        await eventBus.emit('module.error', {
            moduleId: 'test-module',
            message: 'Test error',
            timestamp: new Date()
        });
        
        if (!eventReceived) {
            console.log('   ❌ Event emission failed');
            return false;
        }
        console.log('   ✅ Event emission works');
        
        // Test 3: Test storage events
        console.log('\n3. Testing storage events...');
        
        let storageEventReceived = false;
        eventBus.on('storage.written', (event) => {
            storageEventReceived = true;
            console.log(`   📨 Storage event: ${event.payload.type}/${event.payload.key}`);
        });
        
        await eventBus.emit('storage.written', {
            type: 'test',
            key: 'test-file.json',
            size: 1024
        });
        
        if (!storageEventReceived) {
            console.log('   ❌ Storage event failed');
            return false;
        }
        console.log('   ✅ Storage events work');
        
        // Test 4: Test legacy events
        console.log('\n4. Testing legacy bridge events...');
        
        let legacyEventReceived = false;
        eventBus.on('system.legacy.deprecated', (event) => {
            legacyEventReceived = true;
            console.log(`   📨 Legacy event: ${event.payload.componentName}`);
        });
        
        await eventBus.emit('system.legacy.deprecated', {
            componentName: 'test-component',
            timestamp: new Date()
        });
        
        if (!legacyEventReceived) {
            console.log('   ❌ Legacy event failed');
            return false;
        }
        console.log('   ✅ Legacy events work');
        
        // Test 5: Test LegacyBridge construction (non deve più fallire)
        console.log('\n5. Testing LegacyBridge construction...');
        
        try {
            const { getLegacyBridge } = require('./core/LegacyBridge');
            const legacyBridge = getLegacyBridge();
            console.log('   ✅ LegacyBridge constructed successfully');
        } catch (error) {
            console.log(`   ❌ LegacyBridge construction failed: ${error.message}`);
            return false;
        }
        
        console.log('\n📊 PHASE 1 FIX SUMMARY:');
        console.log('========================');
        console.log(`✅ Critical events registered: ${criticalEvents.length}/8`);
        console.log('✅ Event emission working');
        console.log('✅ Storage events working');
        console.log('✅ Legacy events working');
        console.log('✅ LegacyBridge construction fixed');
        console.log('\n🎉 ALL PHASE 1 FIXES SUCCESSFUL!');
        
        return true;
        
    } catch (error) {
        console.error('❌ Phase 1 test failed:', error.message);
        console.error(error.stack);
        return false;
    }
}

// Esegui i test
if (require.main === module) {
    testPhase1EventFixes()
        .then(success => {
            if (success) {
                console.log('\n🚀 Phase 1 fixes are working - system should be unblocked!');
                console.log('   You can now test: node test-modular-system.js');
                process.exit(0);
            } else {
                console.log('\n💥 Phase 1 fixes still have issues');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Test crashed:', error);
            process.exit(1);
        });
}

module.exports = { testPhase1EventFixes };