module.exports = {
  generateRandomData,
  setTenantHeader,
  logResponseTime
};

function generateRandomData(userContext, events, done) {
  // Generate random test data for load testing
  userContext.vars.customerId = Math.floor(Math.random() * 100) + 1;
  userContext.vars.productId = Math.floor(Math.random() * 200) + 1;
  userContext.vars.quantity = Math.floor(Math.random() * 10) + 1;
  userContext.vars.amount = (Math.random() * 1000).toFixed(2);

  return done();
}

function setTenantHeader(requestParams, context, ee, next) {
  // Rotate through different tenant IDs for multi-tenancy testing
  const tenantIds = ['1', '2', '3', '4', '5'];
  const randomTenantId = tenantIds[Math.floor(Math.random() * tenantIds.length)];

  requestParams.headers = requestParams.headers || {};
  requestParams.headers['x-tenant-id'] = randomTenantId;

  return next();
}

function logResponseTime(requestParams, response, context, ee, next) {
  // Log response times for performance monitoring
  const responseTime = response.timings.phases.total;
  const statusCode = response.statusCode;

  if (responseTime > 1000) {
    console.log(`Slow response: ${responseTime}ms for ${requestParams.url} (Status: ${statusCode})`);
  }

  if (statusCode >= 400) {
    console.log(`Error response: ${statusCode} for ${requestParams.url}`);
  }

  return next();
}