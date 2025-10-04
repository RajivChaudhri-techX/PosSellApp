# ShopXperience Troubleshooting Guide

## Overview

This guide provides solutions to common issues encountered during development, deployment, and operation of ShopXperience. Issues are organized by category for easy reference.

## Development Environment Issues

### Docker Compose Issues

#### Services Won't Start
**Symptoms:**
- `docker-compose up` fails
- Services show "Exit" status
- Port conflicts

**Solutions:**

1. **Check Docker Resources:**
   ```bash
   docker system df
   docker system prune -a
   ```

2. **Verify Port Availability:**
   ```bash
   lsof -i :3000,3001,5432
   # Kill conflicting processes if needed
   ```

3. **Rebuild Services:**
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

4. **Check Logs:**
   ```bash
   docker-compose logs backend
   docker-compose logs frontend
   docker-compose logs db
   ```

#### Database Connection Issues
**Symptoms:**
- Backend shows "Connection refused"
- Sequelize connection errors

**Solutions:**

1. **Wait for Database:**
   ```bash
   docker-compose exec db pg_isready -U shopuser -d shopxperience
   ```

2. **Check Environment Variables:**
   ```bash
   docker-compose exec backend env | grep DB_
   ```

3. **Reset Database:**
   ```bash
   docker-compose down -v
   docker-compose up -d db
   # Wait for db to be ready
   docker-compose up -d backend
   ```

### Node.js Development Issues

#### Module Not Found Errors
**Symptoms:**
- `Cannot find module` errors
- Import/export issues

**Solutions:**

1. **Clear Node Modules:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Package.json:**
   - Verify dependency versions
   - Check for conflicting packages
   - Update to compatible versions

3. **Clear Cache:**
   ```bash
   npm cache clean --force
   ```

#### Port Already in Use
**Symptoms:**
- `EADDRINUSE` errors
- Cannot start development server

**Solutions:**

1. **Find Process Using Port:**
   ```bash
   lsof -ti:3000 | xargs kill -9
   lsof -ti:3001 | xargs kill -9
   ```

2. **Change Port:**
   ```bash
   # In package.json scripts
   "start": "PORT=3002 react-scripts start"
   ```

### React Development Issues

#### Hot Reload Not Working
**Symptoms:**
- Changes not reflected in browser
- Manual refresh required

**Solutions:**

1. **Check File Watching:**
   ```bash
   # In .env
   CHOKIDAR_USEPOLLING=true
   ```

2. **Clear Cache:**
   ```bash
   rm -rf node_modules/.cache
   npm start
   ```

3. **Check File Permissions:**
   ```bash
   sudo chown -R $USER:$USER .
   ```

#### Build Failures
**Symptoms:**
- `npm run build` fails
- TypeScript errors
- Missing dependencies

**Solutions:**

1. **Check Node Version:**
   ```bash
   node --version
   # Should be 18.x
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Clear Build Cache:**
   ```bash
   rm -rf build node_modules/.cache
   npm run build
   ```

### Mobile Development Issues

#### Expo Issues
**Symptoms:**
- Metro bundler won't start
- Build failures
- Device connection issues

**Solutions:**

1. **Clear Expo Cache:**
   ```bash
   npx expo r -c
   ```

2. **Reset Metro:**
   ```bash
   npx expo start --clear
   ```

3. **Update Expo CLI:**
   ```bash
   npm install -g @expo/cli
   ```

#### iOS Simulator Issues
**Symptoms:**
- Simulator won't launch
- Build errors

**Solutions:**

1. **Reset Simulator:**
   ```bash
   xcrun simctl erase all
   ```

2. **Update Xcode:**
   ```bash
   xcode-select --install
   ```

3. **Clean Derived Data:**
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```

## Deployment Issues

### AWS/ECS Issues

#### ECS Service Won't Start
**Symptoms:**
- Service shows PENDING or UNHEALTHY
- Tasks fail to start

**Solutions:**

1. **Check CloudWatch Logs:**
   ```bash
   aws logs tail /ecs/shopxperience --follow
   ```

2. **Verify Environment Variables:**
   - Check Secrets Manager values
   - Verify IAM permissions
   - Confirm VPC/subnet configuration

3. **Check Task Definition:**
   ```bash
   aws ecs describe-task-definition --task-definition shopxperience-task
   ```

4. **Update Service:**
   ```bash
   aws ecs update-service \
     --cluster shopxperience-cluster \
     --service shopxperience-service \
     --force-new-deployment
   ```

#### ALB Health Check Failures
**Symptoms:**
- Target group shows unhealthy targets
- 502/503 errors

**Solutions:**

1. **Check Application Health:**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Verify Security Groups:**
   - ALB can reach ECS tasks
   - ECS tasks can reach RDS

3. **Check ALB Configuration:**
   ```bash
   aws elbv2 describe-target-groups --names shopxperience-backend-tg
   ```

### Database Issues

#### RDS Connection Issues
**Symptoms:**
- Application cannot connect to database
- Timeout errors

**Solutions:**

1. **Check Security Groups:**
   ```bash
   aws ec2 describe-security-groups --group-names shopxperience-rds-sg
   ```

2. **Verify Connection String:**
   - Check RDS endpoint
   - Verify port (5432)
   - Confirm credentials

3. **Test Connection:**
   ```bash
   psql -h <rds-endpoint> -U shopuser -d shopxperience
   ```

#### Migration Failures
**Symptoms:**
- Database migrations fail
- Schema inconsistencies

**Solutions:**

1. **Check Migration Status:**
   ```sql
   SELECT * FROM sequelize_meta ORDER BY name DESC;
   ```

2. **Manual Migration:**
   ```bash
   # Connect to database
   psql -h <rds-endpoint> -U shopuser -d shopxperience

   # Run migration manually
   ```

3. **Rollback if Needed:**
   ```bash
   # Identify failed migration
   # Create rollback script
   ```

### Docker Build Issues

#### Build Failures
**Symptoms:**
- `docker build` fails
- Missing dependencies

**Solutions:**

1. **Check Dockerfile:**
   - Verify base image
   - Confirm COPY commands
   - Check RUN commands

2. **Build with No Cache:**
   ```bash
   docker build --no-cache -t shopxperience-backend .
   ```

3. **Check Build Context:**
   ```bash
   docker build -f backend/Dockerfile .
   ```

## Production Issues

### Performance Issues

#### High CPU Usage
**Symptoms:**
- ECS tasks using high CPU
- Slow response times

**Solutions:**

1. **Check Application Metrics:**
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/ECS \
     --metric-name CPUUtilization \
     --start-time 2023-01-01T00:00:00Z \
     --end-time 2023-01-01T23:59:59Z \
     --period 300 \
     --statistics Average
   ```

2. **Scale Up Tasks:**
   ```bash
   aws ecs update-service \
     --cluster shopxperience-cluster \
     --service shopxperience-service \
     --desired-count 3
   ```

3. **Optimize Application:**
   - Check for memory leaks
   - Optimize database queries
   - Implement caching

#### High Memory Usage
**Symptoms:**
- Out of memory errors
- Application restarts

**Solutions:**

1. **Increase Task Memory:**
   ```bash
   aws ecs update-service \
     --cluster shopxperience-cluster \
     --service shopxperience-service \
     --task-definition shopxperience-task-v2
   ```

2. **Check Memory Leaks:**
   - Monitor heap usage
   - Profile application
   - Optimize memory usage

### Database Performance Issues

#### Slow Queries
**Symptoms:**
- Slow API responses
- Database timeouts

**Solutions:**

1. **Check Query Performance:**
   ```sql
   SELECT query, calls, total_time, mean_time
   FROM pg_stat_statements
   ORDER BY total_time DESC
   LIMIT 10;
   ```

2. **Add Indexes:**
   ```sql
   CREATE INDEX CONCURRENTLY idx_transactions_created_at
   ON transactions(created_at);
   ```

3. **Optimize Queries:**
   - Use EXPLAIN ANALYZE
   - Avoid N+1 queries
   - Implement pagination

#### Connection Pool Exhaustion
**Symptoms:**
- "Too many connections" errors
- Database unavailability

**Solutions:**

1. **Increase Connection Pool:**
   ```javascript
   // In database config
   pool: {
     max: 20,
     min: 5,
     acquire: 30000,
     idle: 10000
   }
   ```

2. **Monitor Connections:**
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```

### Network Issues

#### Intermittent Connectivity
**Symptoms:**
- Random connection failures
- Timeout errors

**Solutions:**

1. **Check VPC Configuration:**
   ```bash
   aws ec2 describe-vpcs --vpc-ids <vpc-id>
   aws ec2 describe-subnets --filters Name=vpc-id,Values=<vpc-id>
   ```

2. **Verify Security Groups:**
   ```bash
   aws ec2 describe-security-groups --group-ids <sg-id>
   ```

3. **Check Route Tables:**
   ```bash
   aws ec2 describe-route-tables --filters Name=vpc-id,Values=<vpc-id>
   ```

## Application-Specific Issues

### Authentication Issues

#### JWT Token Errors
**Symptoms:**
- 401 Unauthorized errors
- Token expiration issues

**Solutions:**

1. **Check Token Validity:**
   ```javascript
   // Decode token to check expiration
   const decoded = jwt.decode(token);
   console.log('Expires:', new Date(decoded.exp * 1000));
   ```

2. **Verify Secret Keys:**
   - Check JWT_SECRET in environment
   - Ensure consistency across instances

3. **Check Token Format:**
   - Verify Bearer prefix
   - Confirm token structure

#### MFA Issues
**Symptoms:**
- MFA setup failures
- Authentication code rejections

**Solutions:**

1. **Check Time Synchronization:**
   ```bash
   date
   # Should match authenticator app time
   ```

2. **Verify Secret Storage:**
   ```sql
   SELECT mfa_secret, mfa_enabled FROM users WHERE id = ?;
   ```

3. **Reset MFA if Needed:**
   ```sql
   UPDATE users SET mfa_secret = NULL, mfa_enabled = false WHERE id = ?;
   ```

### Payment Processing Issues

#### Stripe Integration Errors
**Symptoms:**
- Payment failures
- Webhook processing errors

**Solutions:**

1. **Check API Keys:**
   ```bash
   # In environment variables
   echo $STRIPE_SECRET_KEY
   echo $STRIPE_PUBLISHABLE_KEY
   ```

2. **Verify Webhook Endpoints:**
   ```bash
   curl -X POST https://api.shopxperience.com/api/payments/webhook \
     -H "Content-Type: application/json" \
     -d '{"test": "webhook"}'
   ```

3. **Check Stripe Dashboard:**
   - Review failed payments
   - Check webhook delivery logs

### Inventory Issues

#### Stock Discrepancies
**Symptoms:**
- Inventory counts don't match
- Negative stock values

**Solutions:**

1. **Audit Inventory:**
   ```sql
   SELECT
     p.name,
     i.quantity as system_quantity,
     -- Compare with physical count
   FROM inventory i
   JOIN products p ON i.product_id = p.id
   WHERE i.location_id = ?;
   ```

2. **Check Transaction History:**
   ```sql
   SELECT
     ti.product_id,
     SUM(ti.quantity) as sold_quantity,
     COUNT(*) as transactions
   FROM transaction_items ti
   JOIN transactions t ON ti.transaction_id = t.id
   WHERE t.location_id = ?
     AND t.created_at >= ?
   GROUP BY ti.product_id;
   ```

3. **Recalculate Inventory:**
   ```sql
   -- Adjust inventory based on audit
   UPDATE inventory
   SET quantity = ?
   WHERE product_id = ? AND location_id = ?;
   ```

## Monitoring and Alerting

### Setting Up Alerts

#### CloudWatch Alarms
```bash
# High CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "HighCPU" \
  --alarm-description "CPU utilization is high" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ClusterName,Value=shopxperience-cluster Name=ServiceName,Value=shopxperience-service \
  --alarm-actions <sns-topic-arn>
```

#### Application Monitoring
```javascript
// Add to application
const responseTime = require('response-time');
app.use(responseTime((req, res, time) => {
  // Log response time
  console.log(`${req.method} ${req.url} took ${time} ms`);
}));
```

### Log Analysis

#### Common Log Patterns
- **Error Logs:** Search for "ERROR" or "Exception"
- **Slow Queries:** Look for queries taking >1000ms
- **Failed Authentications:** Check for 401 responses
- **Payment Failures:** Monitor Stripe webhook errors

#### Log Queries
```bash
# CloudWatch Logs insights
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100
```

## Getting Help

### Support Resources

1. **Documentation:**
   - API Documentation
   - Architecture Guide
   - Setup Guide

2. **Community:**
   - GitHub Issues
   - Stack Overflow
   - Developer Forums

3. **Professional Support:**
   - Contact support@shopxperience.com
   - 24/7 emergency support for production issues

### Escalation Procedures

1. **Development Issues:** Check documentation and GitHub issues
2. **Staging Issues:** Involve DevOps team
3. **Production Issues:** Immediate escalation to on-call engineer
4. **Security Issues:** Contact security team immediately

### Diagnostic Information

When reporting issues, include:

- **Environment:** Development/Staging/Production
- **Timestamp:** When the issue occurred
- **User Impact:** Number of users affected
- **Error Messages:** Exact error text
- **Steps to Reproduce:** Detailed reproduction steps
- **Logs:** Relevant log entries
- **Configuration:** Relevant configuration settings

---

Remember to document any new issues and solutions you discover to help improve this troubleshooting guide for future users.