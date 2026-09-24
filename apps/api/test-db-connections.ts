import http from 'http';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  dataSummary?: string;
  error?: string;
}

const BASE_URL = 'http://localhost:4000/api/v1';

function request(path: string, options: { method?: string; body?: any; token?: string } = {}): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const postData = options.body ? JSON.stringify(options.body) : '';
    
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { 'Authorization': `Bearer ${options.token}` } : {}),
        ...(options.body ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode || 500, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode || 500, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runDiagnostics() {
  console.log('🔍 STARTING DATABASE AND ENDPOINT VERIFICATION DIAGNOSTICS...\n');
  const results: TestResult[] = [];

  // 1. Authenticate as Super Admin
  console.log('1. Testing Super Admin Auth...');
  let superToken = '';
  try {
    const res = await request('/auth/login', {
      method: 'POST',
      body: { email: 'superadmin@ros.com', password: 'Admin@1234' }
    });
    if (res.status === 200 && res.body?.data?.accessToken) {
      superToken = res.body.data.accessToken;
      results.push({ endpoint: '/auth/login (Super Admin)', method: 'POST', status: res.status, success: true, dataSummary: `Logged in as: ${res.body.data.user.email}` });
    } else {
      results.push({ endpoint: '/auth/login (Super Admin)', method: 'POST', status: res.status, success: false, error: JSON.stringify(res.body) });
    }
  } catch (e: any) {
    results.push({ endpoint: '/auth/login (Super Admin)', method: 'POST', status: 0, success: false, error: e.message });
  }

  // 2. Authenticate as Tenant Admin (Spice Garden)
  console.log('2. Testing Restaurant Admin Auth...');
  let adminToken = '';
  try {
    const res = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@spicegarden.com', password: 'Admin@1234' }
    });
    if (res.status === 200 && res.body?.data?.accessToken) {
      adminToken = res.body.data.accessToken;
      results.push({ endpoint: '/auth/login (Tenant Admin)', method: 'POST', status: res.status, success: true, dataSummary: `Tenant: ${res.body.data.user.tenantName}, Branch: ${res.body.data.user.activeBranchId}` });
    } else {
      results.push({ endpoint: '/auth/login (Tenant Admin)', method: 'POST', status: res.status, success: false, error: JSON.stringify(res.body) });
    }
  } catch (e: any) {
    results.push({ endpoint: '/auth/login (Tenant Admin)', method: 'POST', status: 0, success: false, error: e.message });
  }

  // List of endpoints to test with Admin Token
  const endpointsToTest = [
    { path: '/auth/me', method: 'GET', desc: 'Current User Profile' },
    { path: '/super-admin/overview', method: 'GET', desc: 'Platform Multi-Tenant Overview', token: superToken },
    { path: '/super-admin/tenants', method: 'GET', desc: 'Tenant List', token: superToken },
    { path: '/menu/categories', method: 'GET', desc: 'Menu Categories' },
    { path: '/menu/items', method: 'GET', desc: 'Menu Items' },
    { path: '/menu/modifiers', method: 'GET', desc: 'Modifier Groups' },
    { path: '/tables', method: 'GET', desc: 'Restaurant Tables' },
    { path: '/tables/floors', method: 'GET', desc: 'Dining Floors' },
    { path: '/tables/reservations', method: 'GET', desc: 'Table Reservations' },
    { path: '/orders', method: 'GET', desc: 'All Orders' },
    { path: '/orders/active', method: 'GET', desc: 'Active Live Orders' },
    { path: '/kitchen/stations', method: 'GET', desc: 'Kitchen Stations' },
    { path: '/kitchen/kots', method: 'GET', desc: 'Kitchen Order Tickets (KOTs)' },
    { path: '/kitchen/queue', method: 'GET', desc: 'Live Kitchen Queue' },
    { path: '/inventory/items', method: 'GET', desc: 'Inventory Raw Items' },
    { path: '/inventory/suppliers', method: 'GET', desc: 'Suppliers' },
    { path: '/inventory/purchase-orders', method: 'GET', desc: 'Purchase Orders' },
    { path: '/staff', method: 'GET', desc: 'Staff Directory' },
    { path: '/staff/roles', method: 'GET', desc: 'RBAC Roles' },
    { path: '/staff/shifts', method: 'GET', desc: 'Shifts & Roster' },
    { path: '/staff/attendance', method: 'GET', desc: 'Staff Attendance' },
    { path: '/reports/sales', method: 'GET', desc: 'Sales Analytics' },
    { path: '/reports/daily-summary', method: 'GET', desc: 'Daily End-of-Day Summary' },
    { path: '/reports/payments', method: 'GET', desc: 'Payment Breakdown' },
    { path: '/reports/tax', method: 'GET', desc: 'GST / Tax Report' },
    { path: '/expenses', method: 'GET', desc: 'Expense Vouchers' },
    { path: '/expenses/summary', method: 'GET', desc: 'Expense Breakdown' },
    { path: '/audit-logs', method: 'GET', desc: 'System Audit Logs' },
    { path: '/feedback', method: 'GET', desc: 'Customer Feedback' },
    { path: '/feedback/stats', method: 'GET', desc: 'Feedback Sentiment Stats' },
    { path: '/ai/demand-forecast', method: 'GET', desc: 'AI Demand Forecast' },
    { path: '/ai/recommendations', method: 'GET', desc: 'AI Upsell Engine' },
  ];

  for (const ep of endpointsToTest) {
    const tkn = ep.token || adminToken;
    try {
      const res = await request(ep.path, { method: ep.method, token: tkn });
      const isSuccess = res.status >= 200 && res.status < 300;
      let summary = '';
      if (res.body?.data) {
        if (Array.isArray(res.body.data)) {
          summary = `Array of ${res.body.data.length} records`;
        } else if (typeof res.body.data === 'object') {
          summary = `Object keys: ${Object.keys(res.body.data).slice(0, 5).join(', ')}`;
        }
      }
      results.push({
        endpoint: ep.path,
        method: ep.method,
        status: res.status,
        success: isSuccess,
        dataSummary: summary || (isSuccess ? 'OK' : JSON.stringify(res.body)),
        error: isSuccess ? undefined : JSON.stringify(res.body)
      });
    } catch (e: any) {
      results.push({
        endpoint: ep.path,
        method: ep.method,
        status: 0,
        success: false,
        error: e.message
      });
    }
  }

  // 3. Test New Order Creation via Prisma
  console.log('3. Testing POS Order Creation and DB Transaction...');
  try {
    const itemsRes = await request('/menu/items', { token: adminToken });
    const tablesRes = await request('/tables', { token: adminToken });

    const firstItem = itemsRes.body?.data?.[0];
    const firstTable = tablesRes.body?.data?.[0];

    const orderPayload = {
      orderType: 'DINE_IN',
      branchId: 'branch-sg-main',
      tableId: firstTable?.id,
      guestCount: 2,
      items: [
        {
          menuItemId: firstItem?.id || 'item-butter-chicken',
          variantId: firstItem?.variants?.[0]?.id,
          quantity: 2,
          unitPrice: 420,
          notes: 'Extra spicy'
        }
      ],
      subtotal: 840,
      taxAmount: 42,
      discountAmount: 0,
      serviceCharge: 0,
      finalAmount: 882
    };

    const res = await request('/orders', {
      method: 'POST',
      body: orderPayload,
      token: adminToken
    });

    results.push({
      endpoint: '/orders (POST Order Placement)',
      method: 'POST',
      status: res.status,
      success: res.status === 201 || res.status === 200,
      dataSummary: res.body?.data ? `Created Order #${res.body.data.orderNumber || res.body.data.id}` : JSON.stringify(res.body),
      error: (res.status === 201 || res.status === 200) ? undefined : JSON.stringify(res.body)
    });
  } catch (e: any) {
    results.push({ endpoint: '/orders (POST Order Placement)', method: 'POST', status: 0, success: false, error: e.message });
  }

  // 4. Test Multi-Tenant Self-Onboarding
  console.log('4. Testing Restaurant Self-Onboarding Flow (/auth/onboard)...');
  try {
    const randomSuffix = Date.now().toString().slice(-4);
    const onboardPayload = {
      name: `Diagnose Bistro ${randomSuffix}`,
      slug: `diag-bistro-${randomSuffix}`,
      ownerName: 'Chef Pierre',
      ownerEmail: `pierre-${randomSuffix}@diagbistro.com`,
      ownerPassword: 'Admin@1234',
      ownerPhone: '+91 98765 00000',
      branchName: 'Downtown Flagship',
      address: '42 Gourmet Avenue, Bangalore',
      city: 'Bangalore',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      cuisineType: 'Fine Dining Continental',
      plan: 'professional',
      tableCount: 12,
      tableCapacity: 4
    };

    const res = await request('/auth/onboard', {
      method: 'POST',
      body: onboardPayload
    });

    results.push({
      endpoint: '/auth/onboard (Self-Onboarding)',
      method: 'POST',
      status: res.status,
      success: res.status === 201 || res.status === 200,
      dataSummary: res.body?.data ? `Tenant '${res.body.data.tenant.name}' provisioned with ${res.body.data.branches?.length || 1} branch` : JSON.stringify(res.body),
      error: (res.status === 201 || res.status === 200) ? undefined : JSON.stringify(res.body)
    });
  } catch (e: any) {
    results.push({ endpoint: '/auth/onboard (Self-Onboarding)', method: 'POST', status: 0, success: false, error: e.message });
  }

  console.log('\n======================================================');
  console.log('📊 DIAGNOSTIC RESULTS SUMMARY');
  console.log('======================================================');
  let passed = 0;
  let failed = 0;

  for (const r of results) {
    const badge = r.success ? '✅' : '❌';
    console.log(`${badge} [${r.status}] ${r.method.padEnd(4)} ${r.endpoint.padEnd(35)} -> ${r.success ? r.dataSummary : r.error}`);
    if (r.success) passed++;
    else failed++;
  }

  console.log('======================================================');
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runDiagnostics().catch((err) => {
  console.error('Fatal diagnostic error:', err);
  process.exit(1);
});
