// OLLAMA DISCONNECTION DIAGNOSTIC TEST SUITE
// Script specifico per replicare e diagnosticare la disconnessione silenziosa di Ollama

const OllamaManagerDiagnostic = require('./app/backend/core/ollama/OllamaManager_Diagnostic.js');
const fs = require('fs');
const path = require('path');

class OllamaDisconnectionDiagnostic {
    constructor() {
        this.manager = new OllamaManagerDiagnostic();
        this.testResults = [];
        this.testStartTime = new Date();
        this.logFile = path.join(__dirname, 'app', 'backend', 'data', 'disconnection_test_log.json');
    }

    async runComprehensiveTest() {
        console.log('\n🔬 === OLLAMA DISCONNECTION DIAGNOSTIC TEST SUITE ===');
        console.log(`Start Time: ${this.testStartTime.toISOString()}`);
        console.log(`Log File: ${this.logFile}`);
        console.log('=====================================================\n');

        try {
            // TEST 1: Baseline System State
            await this.testSystemBaseline();
            
            // TEST 2: Startup with Full Monitoring
            await this.testStartupWithMonitoring();
            
            // TEST 3: 20-second Monitoring Window (problema occurs at 10-15s)
            await this.testDisconnectionWindow();
            
            // TEST 4: Stress Test Stdio Pipes
            await this.testStdioPipeStress();
            
            // TEST 5: Multi-startup Test
            await this.testMultipleStartups();
            
        } catch (error) {
            console.error('❌ Test suite exception:', error);
            this.logTestResult('SUITE_EXCEPTION', false, { error: error.message });
        } finally {
            await this.generateTestReport();
        }
    }

    // TEST 1: Cattura stato baseline del sistema
    async testSystemBaseline() {
        console.log('🧪 TEST 1: System Baseline Analysis');
        
        try {
            // Capture system state prima di qualsiasi operazione
            const baseline = await this.captureSystemBaseline();
            
            console.log('📊 System Baseline captured:');
            console.log(`  - Existing Ollama processes: ${baseline.existingProcesses}`);
            console.log(`  - Port 11434 status: ${baseline.portStatus}`);
            console.log(`  - System memory: ${Math.round(baseline.memoryMB)}MB free`);
            console.log(`  - Ollama installation: ${baseline.ollamaInstalled ? '✅' : '❌'}`);
            
            this.logTestResult('SYSTEM_BASELINE', true, baseline);
            
        } catch (error) {
            console.error('❌ System baseline test failed:', error);
            this.logTestResult('SYSTEM_BASELINE', false, { error: error.message });
        }
    }

    // TEST 2: Startup with comprehensive monitoring
    async testStartupWithMonitoring() {
        console.log('\n🧪 TEST 2: Startup with Full Diagnostic Monitoring');
        
        try {
            console.log('🚀 Starting Ollama with diagnostic monitoring...');
            
            const startTime = Date.now();
            const result = await this.manager.startOllamaServerDiagnostic();
            const startupTime = Date.now() - startTime;
            
            console.log(`📊 Startup completed in ${startupTime}ms:`, result.success ? '✅ SUCCESS' : '❌ FAILED');
            
            if (result.success) {
                console.log(`  - Process PID: ${result.diagnostics?.pid}`);
                console.log(`  - Startup attempts: ${result.diagnostics?.attempts}`);
                console.log(`  - Stdout events: ${result.diagnostics?.stdoutEvents}`);
                console.log(`  - Stderr events: ${result.diagnostics?.stderrEvents}`);
                
                this.logTestResult('STARTUP_MONITORING', true, {
                    startupTime,
                    ...result.diagnostics
                });
            } else {
                console.error('  - Error:', result.message);
                console.error('  - Details:', result.diagnostics);
                
                this.logTestResult('STARTUP_MONITORING', false, {
                    startupTime,
                    error: result.message,
                    diagnostics: result.diagnostics
                });
            }
            
        } catch (error) {
            console.error('❌ Startup monitoring test failed:', error);
            this.logTestResult('STARTUP_MONITORING', false, { error: error.message });
        }
    }

    // TEST 3: 20-second monitoring window per catturare la disconnessione
    async testDisconnectionWindow() {
        console.log('\n🧪 TEST 3: Disconnection Window Monitoring (20 seconds)');
        console.log('⏱️  Monitoring for silent disconnection in critical 10-15 second window...');
        
        const monitoringResults = [];
        const startTime = Date.now();
        
        try {
            for (let i = 0; i < 20; i++) {
                const checkTime = Date.now();
                const secondsElapsed = Math.round((checkTime - startTime) / 1000);
                
                console.log(`🔍 Second ${secondsElapsed}: Checking Ollama status...`);
                
                const healthCheck = await this.manager.ollamaHealthCheckDiagnostic();
                const processState = this.manager.getProcessDiagnosticState();
                
                const checkResult = {
                    second: secondsElapsed,
                    timestamp: new Date().toISOString(),
                    healthy: healthCheck.success,
                    processAlive: processState.state !== 'NO_PROCESS' && !processState.killed,
                    checks: healthCheck.checks,
                    processState: processState
                };
                
                monitoringResults.push(checkResult);
                
                // Log dettagliato ogni secondo
                console.log(`  └─ Health: ${checkResult.healthy ? '✅' : '❌'}, Process: ${checkResult.processAlive ? '✅' : '💀'}, API: ${healthCheck.checks.api.passed ? '✅' : '❌'}`);
                
                // CRITICAL: Se rileva disconnessione, cattura stato dettagliato
                if (!checkResult.healthy && secondsElapsed >= 8) {
                    console.log('🚨 DISCONNECTION DETECTED IN CRITICAL WINDOW!');
                    const disconnectionState = await this.captureDisconnectionState();
                    
                    this.logTestResult('DISCONNECTION_DETECTED', false, {
                        secondsElapsed,
                        disconnectionState,
                        monitoringHistory: monitoringResults.slice(-5) // Ultimi 5 check
                    });
                    
                    break;
                }
                
                await this.sleep(1000); // Wait 1 second
            }
            
            const finalResult = monitoringResults[monitoringResults.length - 1];
            if (finalResult.healthy) {
                console.log('✅ Ollama remained stable during 20-second monitoring window');
                this.logTestResult('DISCONNECTION_WINDOW', true, { 
                    monitoredSeconds: 20,
                    finalState: finalResult,
                    totalChecks: monitoringResults.length
                });
            } else {
                console.log('❌ Ollama became unhealthy during monitoring');
                this.logTestResult('DISCONNECTION_WINDOW', false, { monitoringResults });
            }
            
        } catch (error) {
            console.error('❌ Disconnection window test failed:', error);
            this.logTestResult('DISCONNECTION_WINDOW', false, { 
                error: error.message,
                partialResults: monitoringResults 
            });
        }
    }

    // TEST 4: Stress test sui stdio pipes (ipotesi principale)
    async testStdioPipeStress() {
        console.log('\n🧪 TEST 4: Stdio Pipes Stress Test');
        console.log('📊 Analyzing stdio events and buffer management...');
        
        try {
            // Analizza i dati stdio raccolti dai test precedenti
            const diagnosticSummary = this.manager.getDiagnosticSummary();
            const stdioEvents = diagnosticSummary.stdioEvents;
            
            console.log(`📈 Stdio Analysis:`);
            console.log(`  - Total stdout events: ${stdioEvents.filter(e => e.type === 'STDOUT').length}`);
            console.log(`  - Total stderr events: ${stdioEvents.filter(e => e.type === 'STDERR').length}`);
            
            const stdoutSizes = stdioEvents.filter(e => e.type === 'STDOUT').map(e => e.size);
            const stderrSizes = stdioEvents.filter(e => e.type === 'STDERR').map(e => e.size);
            
            if (stdoutSizes.length > 0) {
                const totalStdout = stdoutSizes.reduce((a, b) => a + b, 0);
                const avgStdout = totalStdout / stdoutSizes.length;
                console.log(`  - Stdout total bytes: ${totalStdout}, average: ${Math.round(avgStdout)}`);
            }
            
            if (stderrSizes.length > 0) {
                const totalStderr = stderrSizes.reduce((a, b) => a + b, 0);
                const avgStderr = totalStderr / stderrSizes.length;
                console.log(`  - Stderr total bytes: ${totalStderr}, average: ${Math.round(avgStderr)}`);
            }
            
            // Analizza pattern nei stdio events che potrebbero indicare problemi
            const rapidFireEvents = this.analyzeRapidFireStdio(stdioEvents);
            
            this.logTestResult('STDIO_STRESS_ANALYSIS', true, {
                stdioEvents: stdioEvents.length,
                stdoutEvents: stdoutSizes.length,
                stderrEvents: stderrSizes.length,
                totalStdoutBytes: stdoutSizes.reduce((a, b) => a + b, 0),
                totalStderrBytes: stderrSizes.reduce((a, b) => a + b, 0),
                rapidFireEvents
            });
            
        } catch (error) {
            console.error('❌ Stdio stress test failed:', error);
            this.logTestResult('STDIO_STRESS_ANALYSIS', false, { error: error.message });
        }
    }

    // TEST 5: Multiple startups to detect patterns
    async testMultipleStartups() {
        console.log('\n🧪 TEST 5: Multiple Startup Pattern Analysis');
        
        const startupResults = [];
        
        for (let i = 1; i <= 3; i++) {
            console.log(`🔄 Startup test #${i}/3`);
            
            try {
                // Stop previous instance if running
                if (this.manager.ollamaProcess) {
                    this.manager.stopMonitoring();
                    this.manager.ollamaProcess.kill();
                    await this.sleep(3000);
                }
                
                const startTime = Date.now();
                const result = await this.manager.startOllamaServerDiagnostic();
                const startupTime = Date.now() - startTime;
                
                const startupResult = {
                    attempt: i,
                    success: result.success,
                    startupTime,
                    diagnostics: result.diagnostics
                };
                
                startupResults.push(startupResult);
                
                console.log(`  ${i}. ${result.success ? '✅ SUCCESS' : '❌ FAILED'} (${startupTime}ms)`);
                
                if (result.success) {
                    // Monitor for 10 seconds to check stability
                    console.log('  ⏱️  Monitoring stability for 10 seconds...');
                    let stable = true;
                    
                    for (let j = 0; j < 10; j++) {
                        await this.sleep(1000);
                        const check = await this.manager.ollamaHealthCheckDiagnostic();
                        if (!check.success) {
                            console.log(`  ❌ Became unstable at ${j+1} seconds`);
                            stable = false;
                            startupResult.becameUnstableAt = j + 1;
                            break;
                        }
                    }
                    
                    startupResult.stable = stable;
                    if (stable) console.log('  ✅ Remained stable for 10 seconds');
                }
                
                await this.sleep(2000); // Pause between tests
                
            } catch (error) {
                console.error(`  ❌ Startup #${i} failed:`, error.message);
                startupResults.push({
                    attempt: i,
                    success: false,
                    error: error.message
                });
            }
        }
        
        // Analyze patterns
        const successfulStartups = startupResults.filter(r => r.success);
        const failedStartups = startupResults.filter(r => !r.success);
        const unstableStartups = startupResults.filter(r => r.success && !r.stable);
        
        console.log(`\n📊 Multiple Startup Analysis:`);
        console.log(`  - Successful startups: ${successfulStartups.length}/3`);
        console.log(`  - Failed startups: ${failedStartups.length}/3`);
        console.log(`  - Unstable startups: ${unstableStartups.length}/3`);
        
        if (successfulStartups.length > 0) {
            const avgStartupTime = successfulStartups.reduce((sum, r) => sum + r.startupTime, 0) / successfulStartups.length;
            console.log(`  - Average startup time: ${Math.round(avgStartupTime)}ms`);
        }
        
        this.logTestResult('MULTIPLE_STARTUP_ANALYSIS', true, {
            totalAttempts: 3,
            successful: successfulStartups.length,
            failed: failedStartups.length,
            unstable: unstableStartups.length,
            results: startupResults
        });
    }

    // Helper methods
    async captureSystemBaseline() {
        return new Promise((resolve) => {
            const { exec } = require('child_process');
            
            exec('tasklist /FI "IMAGENAME eq ollama.exe" /FO CSV & netstat -an | findstr 11434 & ollama --version', 
                (error, stdout, stderr) => {
                    const lines = stdout.split('\n');
                    const processes = lines.filter(line => line.includes('ollama.exe')).length - 1; // -1 per header
                    const listening = lines.filter(line => line.includes('LISTENING')).length;
                    
                    resolve({
                        timestamp: new Date().toISOString(),
                        existingProcesses: Math.max(0, processes),
                        portStatus: listening > 0 ? 'LISTENING' : 'FREE',
                        memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                        ollamaInstalled: !error && stdout.includes('ollama version'),
                        rawOutput: stdout
                    });
                }
            );
        });
    }

    async captureDisconnectionState() {
        const processState = this.manager.getProcessDiagnosticState();
        const systemState = await this.manager.captureSystemState();
        const diagnosticSummary = this.manager.getDiagnosticSummary();
        
        return {
            timestamp: new Date().toISOString(),
            processState,
            systemState,
            recentEvents: diagnosticSummary.systemEvents.slice(-10),
            terminationEvents: diagnosticSummary.terminationEvents,
            lastHealthChecks: diagnosticSummary.lastHealthChecks.slice(-3)
        };
    }

    analyzeRapidFireStdio(stdioEvents) {
        const events = stdioEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        let rapidFireSequences = 0;
        let maxBurstSize = 0;
        
        for (let i = 0; i < events.length - 1; i++) {
            const current = new Date(events[i].timestamp);
            const next = new Date(events[i + 1].timestamp);
            const timeDiff = next - current;
            
            if (timeDiff < 100) { // Events within 100ms
                rapidFireSequences++;
                
                // Count burst size
                let burstSize = 2;
                let j = i + 1;
                while (j < events.length - 1 && new Date(events[j + 1].timestamp) - new Date(events[j].timestamp) < 100) {
                    burstSize++;
                    j++;
                }
                maxBurstSize = Math.max(maxBurstSize, burstSize);
            }
        }
        
        return {
            rapidFireSequences,
            maxBurstSize,
            totalEvents: events.length,
            potentialBufferPressure: rapidFireSequences > 10 || maxBurstSize > 5
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    logTestResult(testName, success, data) {
        const result = {
            test: testName,
            success,
            timestamp: new Date().toISOString(),
            data
        };
        
        this.testResults.push(result);
        
        // Log to file immediately for persistence
        try {
            const logDir = path.dirname(this.logFile);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            fs.writeFileSync(this.logFile, JSON.stringify(this.testResults, null, 2));
        } catch (error) {
            console.error('Failed to write test log:', error);
        }
    }

    async generateTestReport() {
        console.log('\n📋 === DIAGNOSTIC TEST REPORT ===');
        
        const successfulTests = this.testResults.filter(t => t.success).length;
        const totalTests = this.testResults.length;
        const testDuration = Date.now() - this.testStartTime.getTime();
        
        console.log(`\n📊 Test Summary:`);
        console.log(`  - Duration: ${Math.round(testDuration / 1000)} seconds`);
        console.log(`  - Total tests: ${totalTests}`);
        console.log(`  - Successful: ${successfulTests}`);
        console.log(`  - Failed: ${totalTests - successfulTests}`);
        console.log(`  - Success rate: ${Math.round((successfulTests / totalTests) * 100)}%`);
        
        console.log('\n🔍 Key Findings:');
        
        // Analyze for patterns
        const disconnectionDetected = this.testResults.find(t => t.test === 'DISCONNECTION_DETECTED');
        if (disconnectionDetected) {
            console.log(`  🚨 CRITICAL: Disconnection detected at ${disconnectionDetected.data.secondsElapsed} seconds`);
        }
        
        const stdioPressure = this.testResults.find(t => t.test === 'STDIO_STRESS_ANALYSIS');
        if (stdioPressure && stdioPressure.data.rapidFireEvents?.potentialBufferPressure) {
            console.log('  ⚠️  STDIO buffer pressure detected - potential cause');
        }
        
        const multiStartup = this.testResults.find(t => t.test === 'MULTIPLE_STARTUP_ANALYSIS');
        if (multiStartup) {
            const unstableCount = multiStartup.data.unstable;
            if (unstableCount > 0) {
                console.log(`  ⚠️  ${unstableCount} startups became unstable - consistency issue`);
            }
        }
        
        console.log(`\n📁 Detailed logs saved to: ${this.logFile}`);
        console.log(`📁 Diagnostic logs: ${this.manager.diagnosticLogFile}`);
        
        // Export diagnostic manager state
        const diagnosticExport = this.manager.exportDiagnostics();
        const exportFile = this.logFile.replace('.json', '_full_diagnostics.json');
        fs.writeFileSync(exportFile, JSON.stringify(diagnosticExport, null, 2));
        console.log(`📁 Full diagnostics exported to: ${exportFile}`);
        
        console.log('\n✅ Diagnostic test suite completed');
    }
}

// Auto-run se chiamato direttamente
if (require.main === module) {
    const tester = new OllamaDisconnectionDiagnostic();
    tester.runComprehensiveTest().catch(console.error);
}

module.exports = OllamaDisconnectionDiagnostic;