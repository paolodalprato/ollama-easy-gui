/**
 * TEST DOUBLE REGISTRATION FIX - OPZIONE B
 * Test per verificare che la doppia registrazione non faccia più crashare il sistema
 */

async function testDoubleRegistrationFix() {
    console.log('🧪 Testing Double Registration Fix (Option B)...\n');
    
    try {
        // Test 1: EventBus gestisce doppia registrazione senza errori
        console.log('1. Testing double event registration handling...');
        
        const { EventBus } = require('./core/EventBus');
        const eventBus = new EventBus();
        eventBus.setDebugMode(true);
        
        // Prima registrazione
        eventBus.registerEventType('test.double.event', { type: 'object' });
        console.log('   ✅ First registration successful');
        
        // Seconda registrazione - dovrebbe essere skippata senza errore
        try {
            eventBus.registerEventType('test.double.event', { type: 'object' });
            console.log('   ✅ Second registration skipped gracefully');
        } catch (error) {
            console.log(`   ❌ Second registration failed: ${error.message}`);
            return false;
        }
        
        // Verifica che l'evento sia ancora utilizzabile
        let eventReceived = false;
        eventBus.on('test.double.event', () => { eventReceived = true; });
        await eventBus.emit('test.double.event', { test: true });
        
        if (!eventReceived) {
            console.log('   ❌ Event not working after double registration');
            return false;
        }
        console.log('   ✅ Event still working after double registration');
        
        // Test 2: Singleton + Kernel registration scenario
        console.log('\n2. Testing singleton + kernel registration scenario...');
        
        // Simula scenario reale: getEventBus() registra, poi Kernel tenta di registrare
        const { getEventBus } = require('./core/EventBus');
        const singletonBus = getEventBus(); // Auto-registra eventi
        
        // Verifica che eventi siano registrati
        const hasSystemStartup = singletonBus.eventTypes.has('system.startup');
        console.log(`   EventBus singleton has 'system.startup': ${hasSystemStartup}`);
        
        if (!hasSystemStartup) {
            console.log('   ❌ Singleton auto-registration not working');
            return false;
        }
        
        // Simula seconda registrazione (come farebbe Kernel)
        try {
            singletonBus.registerEventType('system.startup', { type: 'object', required: true });
            console.log('   ✅ Kernel re-registration handled gracefully');
        } catch (error) {
            console.log(`   ❌ Kernel re-registration failed: ${error.message}`);
            return false;
        }
        
        // Test 3: Eventi funzionano ancora
        console.log('\n3. Testing events work after double registration...');
        
        let systemEventReceived = false;
        singletonBus.on('system.startup', (event) => {
            systemEventReceived = true;
            console.log(`   📨 Received: ${event.type}`);
        });
        
        await singletonBus.emit('system.startup', {
            kernelId: 'test-kernel',
            bootTime: 100
        });
        
        if (!systemEventReceived) {
            console.log('   ❌ System event not working');
            return false;
        }
        console.log('   ✅ System events working after double registration');
        
        // Test 4: Kernel registration flow simulation
        console.log('\n4. Testing complete kernel registration flow...');
        
        const { registerOllamaGUIEvents } = require('./core/EventBus');
        
        // Simula scenario completo: prima auto-registration, poi kernel registration
        try {
            registerOllamaGUIEvents(singletonBus);
            console.log('   ✅ Complete kernel registration flow successful');
        } catch (error) {
            console.log(`   ❌ Kernel registration flow failed: ${error.message}`);
            return false;
        }
        
        console.log('\n📊 DOUBLE REGISTRATION FIX SUMMARY:');
        console.log('====================================');
        console.log('✅ Double registration handled gracefully');
        console.log('✅ Events remain functional after double registration');
        console.log('✅ Singleton + Kernel scenario works');
        console.log('✅ Complete registration flow successful');
        console.log('\n🎉 OPTION B FIX SUCCESSFUL!');
        
        return true;
        
    } catch (error) {
        console.error('❌ Double registration test failed:', error.message);
        console.error(error.stack);
        return false;
    }
}

// Esegui i test
if (require.main === module) {
    testDoubleRegistrationFix()
        .then(success => {
            if (success) {
                console.log('\n🚀 Double registration fix working!');
                console.log('   The modular system should now start without errors');
                console.log('   Test again: node test-modular-system.js');
                process.exit(0);
            } else {
                console.log('\n💥 Double registration fix has issues');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Test crashed:', error);
            process.exit(1);
        });
}

module.exports = { testDoubleRegistrationFix };