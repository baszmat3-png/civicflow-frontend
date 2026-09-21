import express from 'express';
import http from 'http';
import { app } from './app.js';
import { env } from './config/env.js';

async function runMaintenanceTests() {
  console.log('🧪 Starting CivicFlow Maintenance Mode Verification Suite...\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`📡 Test Server running on port ${port}\n`);

  let passedTests = 0;
  let totalTests = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    }
  };

  try {
    // ==========================================
    // 1. TEST STATE A: MAINTENANCE_MODE = true
    // ==========================================
    console.log('📋 --- STATE A: Testing with MAINTENANCE_MODE = true ---');
    env.MAINTENANCE_MODE = true;

    // Test 1: Health check must return 200 OK with maintenance: true
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    assert(
      healthRes.status === 200 && healthData.maintenance === true,
      'Health Check (/api/health) returns 200 OK with maintenance: true',
      `Got status ${healthRes.status}, body: ${JSON.stringify(healthData)}`
    );

    // Test 2: Maintenance Status check must return 200 OK with maintenance: true
    const statusRes = await fetch(`${baseUrl}/api/maintenance/status`);
    const statusData = await statusRes.json();
    assert(
      statusRes.status === 200 && statusData.maintenance === true,
      'Maintenance Status (/api/maintenance/status) returns 200 OK with maintenance: true',
      `Got status ${statusRes.status}`
    );

    // Test 3: Auth Login route must return 503 Service Unavailable
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
    });
    const loginData = await loginRes.json();
    assert(
      loginRes.status === 503 && loginData.maintenance === true,
      'POST /api/auth/login blocked with HTTP 503 Service Unavailable',
      `Got status ${loginRes.status}`
    );

    // Test 4: Requests list route must return 503
    const reqRes = await fetch(`${baseUrl}/api/requests`);
    assert(
      reqRes.status === 503,
      'GET /api/requests blocked with HTTP 503 Service Unavailable',
      `Got status ${reqRes.status}`
    );

    // Test 5: Customers route must return 503
    const custRes = await fetch(`${baseUrl}/api/customers`);
    assert(
      custRes.status === 503,
      'GET /api/customers blocked with HTTP 503 Service Unavailable',
      `Got status ${custRes.status}`
    );

    // Test 6: Ministries route must return 503
    const minRes = await fetch(`${baseUrl}/api/ministries`);
    assert(
      minRes.status === 503,
      'GET /api/ministries blocked with HTTP 503 Service Unavailable',
      `Got status ${minRes.status}`
    );

    // Test 7: Public submit-request route must return 503
    const pubSubmitRes = await fetch(`${baseUrl}/api/public/submit-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'مراجع تجريبي' })
    });
    assert(
      pubSubmitRes.status === 503,
      'POST /api/public/submit-request blocked with HTTP 503 Service Unavailable',
      `Got status ${pubSubmitRes.status}`
    );

    // Test 8: Public track route must return 503
    const pubTrackRes = await fetch(`${baseUrl}/api/public/track/REQ-1001`);
    assert(
      pubTrackRes.status === 503,
      'GET /api/public/track/:requestNumber blocked with HTTP 503 Service Unavailable',
      `Got status ${pubTrackRes.status}`
    );

    // Test 9: CORS OPTIONS preflight request must NOT return 503
    const corsRes = await fetch(`${baseUrl}/api/requests`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://civicflow-frontend-1-hoy9.onrender.com',
        'Access-Control-Request-Method': 'GET'
      }
    });
    assert(
      corsRes.status === 204 || corsRes.status === 200,
      'CORS OPTIONS preflight passes cleanly (not 503)',
      `Got status ${corsRes.status}`
    );

    // ==========================================
    // 2. TEST STATE B: MAINTENANCE_MODE = false
    // ==========================================
    console.log('\n📋 --- STATE B: Testing with MAINTENANCE_MODE = false (Normal Operation) ---');
    env.MAINTENANCE_MODE = false;

    // Test 10: Health check returns maintenance: false
    const healthNormalRes = await fetch(`${baseUrl}/api/health`);
    const healthNormalData = await healthNormalRes.json();
    assert(
      healthNormalRes.status === 200 && healthNormalData.maintenance === false,
      'Health Check (/api/health) returns maintenance: false',
      `Got status ${healthNormalRes.status}`
    );

    // Test 11: Maintenance status returns maintenance: false
    const statusNormalRes = await fetch(`${baseUrl}/api/maintenance/status`);
    const statusNormalData = await statusNormalRes.json();
    assert(
      statusNormalRes.status === 200 && statusNormalData.maintenance === false,
      'Maintenance Status (/api/maintenance/status) returns maintenance: false',
      `Got status ${statusNormalRes.status}`
    );

    // Test 12: Public test endpoint functions normally (not 503)
    const testPublicRes = await fetch(`${baseUrl}/api/test/public`);
    assert(
      testPublicRes.status === 200,
      'GET /api/test/public returns 200 OK (normal API operation)',
      `Got status ${testPublicRes.status}`
    );

    // Test 13: Normal validation error on login (e.g. 422/400 instead of 503)
    const loginNormalRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid_email_format', password: '' })
    });
    assert(
      loginNormalRes.status === 422 || loginNormalRes.status === 400,
      'POST /api/auth/login processes validation normally (422 Unprocessable Entity, not 503)',
      `Got status ${loginNormalRes.status}`
    );

    console.log(`\n========================================`);
    console.log(`📊 Test Results: ${passedTests}/${totalTests} Tests Passed successfully!`);
    console.log(`========================================\n`);

    if (passedTests === totalTests) {
      console.log('🎉 All Maintenance Mode requirements verified successfully!');
      process.exit(0);
    } else {
      console.error('❌ Some tests failed.');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Test suite execution error:', err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runMaintenanceTests();
