const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const TEST_TENANT_ID = '1';

class SecurityTester {
  constructor() {
    this.vulnerabilities = [];
    this.passedTests = 0;
    this.failedTests = 0;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  }

  reportVulnerability(severity, title, description, endpoint, payload = null) {
    const vuln = {
      severity,
      title,
      description,
      endpoint,
      payload,
      timestamp: new Date().toISOString()
    };

    this.vulnerabilities.push(vuln);
    this.log(`${severity.toUpperCase()}: ${title}`, 'error');
  }

  async testSQLInjection() {
    this.log('Testing SQL Injection vulnerabilities...');

    const payloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "1' OR '1' = '1"
    ];

    const endpoints = [
      { url: '/api/auth/login', method: 'post', data: { username: '', password: '' } },
      { url: '/api/customers', method: 'get' },
      { url: '/api/products', method: 'get' }
    ];

    for (const endpoint of endpoints) {
      for (const payload of payloads) {
        try {
          const config = {
            method: endpoint.method,
            url: `${BASE_URL}${endpoint.url}`,
            headers: { 'x-tenant-id': TEST_TENANT_ID },
            data: endpoint.data ? { ...endpoint.data, username: payload, password: payload } : undefined,
            params: { search: payload },
            timeout: 5000
          };

          const response = await axios(config);

          if (response.status === 500 || response.data.error?.includes('SQL')) {
            this.reportVulnerability('high', 'Potential SQL Injection', 'Server returned error suggesting SQL injection vulnerability', endpoint.url, payload);
          }
        } catch (error) {
          if (error.response?.status === 500) {
            this.reportVulnerability('high', 'Potential SQL Injection', 'Server error on malicious input', endpoint.url, payload);
          }
        }
      }
    }

    this.log('SQL Injection tests completed');
  }

  async testXSS() {
    this.log('Testing XSS vulnerabilities...');

    const payloads = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert("xss")>',
      'javascript:alert("xss")',
      '<iframe src="javascript:alert(\'xss\')"></iframe>'
    ];

    const endpoints = [
      { url: '/api/customers', method: 'post', data: { first_name: '', last_name: '', email: 'test@example.com' } },
      { url: '/api/products', method: 'post', data: { name: '', sku: 'TEST', price: 10 } }
    ];

    for (const endpoint of endpoints) {
      for (const payload of payloads) {
        try {
          const config = {
            method: endpoint.method,
            url: `${BASE_URL}${endpoint.url}`,
            headers: {
              'x-tenant-id': TEST_TENANT_ID,
              'Authorization': 'Bearer test_token'
            },
            data: { ...endpoint.data, first_name: payload, name: payload },
            timeout: 5000
          };

          const response = await axios(config);

          if (response.data && JSON.stringify(response.data).includes(payload)) {
            this.reportVulnerability('medium', 'Potential XSS Vulnerability', 'User input reflected in response without sanitization', endpoint.url, payload);
          }
        } catch (error) {
          // Expected for unauthorized requests
        }
      }
    }

    this.log('XSS tests completed');
  }

  async testAuthenticationBypass() {
    this.log('Testing authentication bypass...');

    const endpoints = [
      '/api/customers',
      '/api/products',
      '/api/transactions',
      '/api/inventory'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
          headers: { 'x-tenant-id': TEST_TENANT_ID },
          timeout: 5000
        });

        if (response.status === 200) {
          this.reportVulnerability('critical', 'Authentication Bypass', 'Endpoint accessible without authentication', endpoint);
        }
      } catch (error) {
        if (error.response?.status !== 401 && error.response?.status !== 403) {
          this.reportVulnerability('high', 'Unexpected Authentication Behavior', `Unexpected status: ${error.response?.status}`, endpoint);
        }
      }
    }

    this.log('Authentication bypass tests completed');
  }

  async testRateLimiting() {
    this.log('Testing rate limiting...');

    const requests = [];
    for (let i = 0; i < 100; i++) {
      requests.push(
        axios.post(`${BASE_URL}/api/auth/login`, {
          username: 'test',
          password: 'test'
        }, {
          headers: { 'x-tenant-id': TEST_TENANT_ID },
          timeout: 5000
        }).catch(error => error)
      );
    }

    const results = await Promise.all(requests);
    const rateLimited = results.filter(result =>
      result.response?.status === 429 ||
      result.response?.status === 503
    );

    if (rateLimited.length === 0) {
      this.reportVulnerability('medium', 'No Rate Limiting', 'No rate limiting detected on authentication endpoint', '/api/auth/login');
    } else {
      this.log(`Rate limiting detected: ${rateLimited.length} requests blocked`);
    }

    this.log('Rate limiting tests completed');
  }

  async testSensitiveDataExposure() {
    this.log('Testing sensitive data exposure...');

    try {
      const response = await axios.get(`${BASE_URL}/api/customers`, {
        headers: {
          'x-tenant-id': TEST_TENANT_ID,
          'Authorization': 'Bearer test_token'
        },
        timeout: 5000
      });

      if (response.data?.customers) {
        const customer = response.data.customers[0];
        if (customer && customer.password_hash) {
          this.reportVulnerability('high', 'Sensitive Data Exposure', 'Password hashes exposed in API response', '/api/customers');
        }
      }
    } catch (error) {
      // Expected for invalid token
    }

    this.log('Sensitive data exposure tests completed');
  }

  async testSecurityHeaders() {
    this.log('Testing security headers...');

    try {
      const response = await axios.get(`${BASE_URL}/api/products`, {
        headers: { 'x-tenant-id': TEST_TENANT_ID },
        timeout: 5000
      });

      const headers = response.headers;
      const missingHeaders = [];

      if (!headers['x-content-type-options']) missingHeaders.push('X-Content-Type-Options');
      if (!headers['x-frame-options']) missingHeaders.push('X-Frame-Options');
      if (!headers['x-xss-protection']) missingHeaders.push('X-XSS-Protection');
      if (!headers['strict-transport-security']) missingHeaders.push('Strict-Transport-Security');

      if (missingHeaders.length > 0) {
        this.reportVulnerability('low', 'Missing Security Headers', `Missing security headers: ${missingHeaders.join(', ')}`, '/api/products');
      }
    } catch (error) {
      // Continue testing
    }

    this.log('Security headers tests completed');
  }

  async testTenantIsolation() {
    this.log('Testing tenant isolation...');

    // Try to access tenant 2 data from tenant 1 context
    try {
      const response = await axios.get(`${BASE_URL}/api/customers/1`, {
        headers: {
          'x-tenant-id': '2', // Wrong tenant
          'Authorization': 'Bearer test_token'
        },
        timeout: 5000
      });

      if (response.status === 200) {
        this.reportVulnerability('critical', 'Tenant Isolation Failure', 'Able to access data from different tenant', '/api/customers/1');
      }
    } catch (error) {
      if (error.response?.status !== 404 && error.response?.status !== 403) {
        this.reportVulnerability('high', 'Unexpected Tenant Isolation Behavior', `Unexpected status: ${error.response?.status}`, '/api/customers/1');
      }
    }

    this.log('Tenant isolation tests completed');
  }

  async runAllTests() {
    this.log('Starting comprehensive security testing...');

    await this.testSQLInjection();
    await this.testXSS();
    await this.testAuthenticationBypass();
    await this.testRateLimiting();
    await this.testSensitiveDataExposure();
    await this.testSecurityHeaders();
    await this.testTenantIsolation();

    this.generateReport();
  }

  generateReport() {
    const report = {
      summary: {
        totalTests: this.passedTests + this.failedTests,
        vulnerabilitiesFound: this.vulnerabilities.length,
        critical: this.vulnerabilities.filter(v => v.severity === 'critical').length,
        high: this.vulnerabilities.filter(v => v.severity === 'high').length,
        medium: this.vulnerabilities.filter(v => v.severity === 'medium').length,
        low: this.vulnerabilities.filter(v => v.severity === 'low').length
      },
      vulnerabilities: this.vulnerabilities,
      generatedAt: new Date().toISOString()
    };

    fs.writeFileSync('security-report.json', JSON.stringify(report, null, 2));

    this.log(`Security testing completed. Found ${this.vulnerabilities.length} vulnerabilities.`);
    this.log('Report saved to security-report.json');

    // Print summary
    console.log('\n=== SECURITY TEST SUMMARY ===');
    console.log(`Critical: ${report.summary.critical}`);
    console.log(`High: ${report.summary.high}`);
    console.log(`Medium: ${report.summary.medium}`);
    console.log(`Low: ${report.summary.low}`);
    console.log(`Total: ${report.summary.vulnerabilitiesFound}`);
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new SecurityTester();
  tester.runAllTests().catch(console.error);
}

module.exports = SecurityTester;