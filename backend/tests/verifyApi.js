const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testBackend() {
  console.log('🧪 Starting API Health & Monitoring Backend Tests...\n');

  try {
    // 1. Login as Demo User
    console.log('1️⃣ Testing Demo User Login...');
    const demoLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'demo@healthcheck.io',
      password: 'Demo@12345',
    });
    console.log('✅ Demo login success:', demoLoginRes.data.data.user);
    const demoToken = demoLoginRes.data.data.token;

    // 2. Fetch User Monitored APIs
    console.log('\n2️⃣ Testing Get User APIs...');
    const apisRes = await axios.get(`${BASE_URL}/monitors`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    console.log(`✅ Retrieved ${apisRes.data.data.length} APIs for demo user:`);
    apisRes.data.data.forEach((api) => {
      console.log(`   - [${api.current_status}] ${api.name} (${api.url}) | Uptime: ${api.stats.uptimePercentage}% | Latency: ${api.stats.avgLatencyMs}ms`);
    });

    const firstApi = apisRes.data.data[0];

    // 3. Test Manual Check Now on First API
    console.log(`\n3️⃣ Testing Manual Health Check Trigger on API #${firstApi.id}...`);
    const checkRes = await axios.post(`${BASE_URL}/monitors/${firstApi.id}/check`, {}, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    console.log('✅ Manual check response:', checkRes.data.data.check);

    // 4. Test API History Logs
    console.log(`\n4️⃣ Testing Health History Logs for API #${firstApi.id}...`);
    const historyRes = await axios.get(`${BASE_URL}/metrics/apis/${firstApi.id}/history?limit=5`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    console.log(`✅ Retrieved ${historyRes.data.data.logs.length} history records (Total: ${historyRes.data.data.pagination.total})`);

    // 5. Test Dashboard Overview
    console.log('\n5️⃣ Testing Dashboard Overview Summary...');
    const overviewRes = await axios.get(`${BASE_URL}/metrics/dashboard`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    console.log('✅ Dashboard overview stats:', overviewRes.data.data.stats);

    // 6. Test Registering a New API
    console.log('\n6️⃣ Testing Register New API...');
    const newApiRes = await axios.post(
      `${BASE_URL}/monitors`,
      {
        name: 'Echo Test Service',
        url: 'http://localhost:5000/api/mock/echo',
        method: 'POST',
        headers: { 'X-Custom-Test': 'Active' },
        request_body: JSON.stringify({ message: 'Ping' }),
        expected_status_code: 200,
        check_interval: '5m',
        timeout_ms: 3000,
      },
      { headers: { Authorization: `Bearer ${demoToken}` } }
    );
    console.log('✅ New API created & checked:', {
      id: newApiRes.data.data.id,
      name: newApiRes.data.data.name,
      status: newApiRes.data.data.current_status,
      latency: newApiRes.data.data.last_response_time_ms,
    });

    // 7. Login as Admin
    console.log('\n7️⃣ Testing Admin Login & RBAC...');
    const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@healthcheck.io',
      password: 'Admin@12345',
    });
    const adminToken = adminLoginRes.data.data.token;
    console.log('✅ Admin login success:', adminLoginRes.data.data.user);

    // 8. Admin Global Stats & Users
    console.log('\n8️⃣ Testing Admin Global Stats & User List...');
    const adminStatsRes = await axios.get(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('✅ Global Platform Stats:', adminStatsRes.data.data);

    const adminUsersRes = await axios.get(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`✅ Admin retrieved ${adminUsersRes.data.data.length} registered users.`);

    // 9. Verify standard user CANNOT access admin routes (RBAC check)
    console.log('\n9️⃣ Verifying RBAC protection (Demo user accessing /admin/stats should fail)...');
    try {
      await axios.get(`${BASE_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${demoToken}` },
      });
      console.error('❌ Security alert: Demo user was allowed to access admin routes!');
    } catch (rbacErr) {
      if (rbacErr.response?.status === 403) {
        console.log('✅ RBAC properly enforced! Received 403 Forbidden:', rbacErr.response.data.message);
      } else {
        console.warn('⚠️ Unexpected status code:', rbacErr.response?.status);
      }
    }

    console.log('\n🎉 ALL BACKEND HEALTH & MONITORING ENDPOINTS ARE WORKING PERFECTLY!\n');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testBackend();
