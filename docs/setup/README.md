# ShopXperience Setup and Deployment Guide

## Overview

This guide covers setting up and deploying ShopXperience for both development and production environments. The system consists of a React frontend, Node.js backend, PostgreSQL database, and React Native mobile app.

## Prerequisites

### System Requirements

- **Node.js**: 18.x or later
- **Docker**: 20.x or later
- **Docker Compose**: 2.x or later
- **Git**: 2.x or later
- **PostgreSQL**: 15.x (for local development without Docker)

### Development Tools

- **Backend**: Express.js, Sequelize ORM
- **Frontend**: React 18, Material-UI
- **Mobile**: React Native, Expo CLI
- **Database**: PostgreSQL 15
- **Infrastructure**: Terraform, AWS (for production)

### Accounts and Keys

- **AWS Account** (for production deployment)
- **Stripe Account** (for payment processing)
- **Apple Developer Account** (for iOS app store)
- **Google Play Developer Account** (for Android app store)

## Local Development Setup

### Quick Start with Docker

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/shopxperience.git
   cd shopxperience
   ```

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **Wait for services to be healthy:**
   ```bash
   docker-compose ps
   ```

4. **Access the application:**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000
   - Database: localhost:5432

### Manual Setup (Without Docker)

#### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   ```env
   NODE_ENV=development
   PORT=3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=shopxperience
   DB_USER=shopuser
   DB_PASSWORD=shoppass
   JWT_SECRET=your-jwt-secret-key
   STRIPE_SECRET_KEY=your-stripe-secret-key
   CORS_ORIGIN=http://localhost:3001
   ```

4. **Set up PostgreSQL database:**
   ```sql
   CREATE DATABASE shopxperience;
   CREATE USER shopuser WITH PASSWORD 'shoppass';
   GRANT ALL PRIVILEGES ON DATABASE shopxperience TO shopuser;
   ```

5. **Run database migrations:**
   ```bash
   npm run migrate
   ```

6. **Start the backend:**
   ```bash
   npm run dev
   ```

#### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```env
   REACT_APP_API_BASE_URL=http://localhost:3000/api
   REACT_APP_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
   ```

4. **Start the frontend:**
   ```bash
   npm start
   ```

#### Mobile App Setup

1. **Install Expo CLI:**
   ```bash
   npm install -g @expo/cli
   ```

2. **Navigate to mobile directory:**
   ```bash
   cd mobile
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start the development server:**
   ```bash
   npm start
   ```

5. **Run on device/emulator:**
   - iOS: Press `i` in terminal or scan QR code with Camera app
   - Android: Press `a` in terminal or scan QR code with Expo Go app

## Production Deployment

### AWS Infrastructure Setup

#### Prerequisites

1. **Install Terraform:**
   ```bash
   # macOS with Homebrew
   brew install terraform

   # Or download from https://www.terraform.io/downloads
   ```

2. **Configure AWS CLI:**
   ```bash
   aws configure
   ```

3. **Set up Terraform variables:**
   Create `terraform/terraform.tfvars`:
   ```hcl
   aws_region = "us-east-1"
   db_name = "shopxperience"
   db_username = "shopuser"
   db_password = "your-secure-db-password"
   ```

#### Deploy Infrastructure

1. **Navigate to terraform directory:**
   ```bash
   cd terraform
   ```

2. **Initialize Terraform:**
   ```bash
   terraform init
   ```

3. **Plan the deployment:**
   ```bash
   terraform plan
   ```

4. **Apply the configuration:**
   ```bash
   terraform apply
   ```

5. **Note the output values** (ALB DNS name, ECR repository URLs)

### Application Deployment

#### Build and Push Docker Images

1. **Build backend image:**
   ```bash
   cd backend
   docker build -t shopxperience-backend .
   ```

2. **Tag and push to ECR:**
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
   docker tag shopxperience-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/shopxperience-backend:latest
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/shopxperience-backend:latest
   ```

3. **Build and push frontend image:**
   ```bash
   cd frontend
   docker build -t shopxperience-frontend .
   docker tag shopxperience-frontend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/shopxperience-frontend:latest
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/shopxperience-frontend:latest
   ```

#### Update Secrets

1. **Update Secrets Manager values:**
   ```bash
   aws secretsmanager update-secret \
     --secret-id shopxperience/db-password \
     --secret-string "your-secure-db-password"

   aws secretsmanager update-secret \
     --secret-id shopxperience/jwt-secret \
     --secret-string "your-super-secret-jwt-key"

   aws secretsmanager update-secret \
     --secret-id shopxperience/stripe-secret \
     --secret-string "your-stripe-secret-key"
   ```

#### Deploy ECS Service

1. **Update ECS service:**
   ```bash
   aws ecs update-service \
     --cluster shopxperience-cluster \
     --service shopxperience-service \
     --force-new-deployment
   ```

2. **Monitor deployment:**
   ```bash
   aws ecs describe-services \
     --cluster shopxperience-cluster \
     --services shopxperience-service
   ```

### Domain Configuration

1. **Point domain to ALB:**
   - Get ALB DNS name from Terraform output
   - Create CNAME record: `app.yourdomain.com` → `<alb-dns-name>`

2. **SSL Certificate:**
   - Request certificate in AWS Certificate Manager
   - Update ALB listener to use HTTPS

## Environment Configuration

### Environment Variables

#### Backend (.env)

```env
NODE_ENV=production
PORT=3000
DB_HOST=<rds-endpoint>
DB_PORT=5432
DB_NAME=shopxperience
DB_USER=shopuser
DB_PASSWORD=<from-secrets-manager>
JWT_SECRET=<from-secrets-manager>
STRIPE_SECRET_KEY=<from-secrets-manager>
CORS_ORIGIN=https://app.yourdomain.com
LOG_LEVEL=info
```

#### Frontend (Build-time)

```env
REACT_APP_API_BASE_URL=https://app.yourdomain.com/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_...
REACT_APP_ENVIRONMENT=production
```

### Database Initialization

1. **Connect to RDS:**
   ```bash
   psql -h <rds-endpoint> -U shopuser -d shopxperience
   ```

2. **Run migrations:**
   ```sql
   -- Run migration scripts to create tables
   -- See backend/migrations/ for scripts
   ```

3. **Create initial tenant and admin user:**
   ```sql
   -- Insert initial data
   INSERT INTO tenants (name, domain) VALUES ('Default Tenant', 'default');
   -- Create admin user, etc.
   ```

## Mobile App Deployment

### iOS Deployment

1. **Install dependencies:**
   ```bash
   cd mobile
   npm install
   npx expo install --fix
   ```

2. **Configure app.json:**
   ```json
   {
     "expo": {
       "name": "ShopXperience",
       "slug": "shopxperience",
       "version": "1.0.0",
       "ios": {
         "bundleIdentifier": "com.yourcompany.shopxperience"
       }
     }
   }
   ```

3. **Build for iOS:**
   ```bash
   npx expo build:ios
   ```

4. **Submit to App Store:**
   - Use Xcode to open the generated project
   - Configure signing certificates
   - Archive and upload to App Store Connect

### Android Deployment

1. **Configure app.json:**
   ```json
   {
     "expo": {
       "name": "ShopXperience",
       "slug": "shopxperience",
       "version": "1.0.0",
       "android": {
         "package": "com.yourcompany.shopxperience"
       }
     }
   }
   ```

2. **Build APK/AAB:**
   ```bash
   npx expo build:android
   ```

3. **Upload to Google Play:**
   - Use Google Play Console
   - Upload AAB file
   - Configure store listing and publish

## Monitoring and Maintenance

### Health Checks

- **Application Health**: `/health` endpoint
- **Database Health**: Built-in RDS monitoring
- **Container Health**: ECS service health checks

### Logging

- **Application Logs**: CloudWatch Logs
- **Access Logs**: ALB access logs
- **Database Logs**: RDS error logs

### Backup Strategy

- **Database Backups**: Automated RDS snapshots
- **File Backups**: ECR image versions
- **Configuration Backups**: Terraform state

### Scaling

- **Auto Scaling**: ECS service scales based on CPU/memory
- **Database Scaling**: RDS read replicas for high traffic
- **CDN**: CloudFront for static assets

## Security Configuration

### Network Security

- **VPC**: Isolated network with public/private subnets
- **Security Groups**: Minimal required access
- **ALB**: SSL/TLS termination

### Application Security

- **Helmet.js**: Security headers
- **Rate Limiting**: API rate limiting
- **Input Validation**: Joi schema validation
- **Authentication**: JWT with MFA support

### Data Security

- **Encryption**: Data at rest and in transit
- **Secrets Management**: AWS Secrets Manager
- **PCI Compliance**: Stripe for payment processing

## Troubleshooting Deployment

### Common Issues

**ECS Service Won't Start:**
- Check CloudWatch logs for container errors
- Verify environment variables and secrets
- Ensure ECR images are accessible

**Database Connection Issues:**
- Verify security group rules
- Check RDS endpoint and port
- Validate credentials in Secrets Manager

**ALB Health Checks Failing:**
- Check target group health
- Verify application health endpoint
- Review security group configurations

**Mobile App Build Issues:**
- Clear Expo cache: `expo r -c`
- Update Expo CLI and SDK
- Check device/emulator compatibility

### Getting Help

- **Documentation**: Refer to troubleshooting guides
- **AWS Support**: For infrastructure issues
- **Expo Support**: For mobile app issues
- **Community Forums**: GitHub issues and discussions

## Cost Optimization

### AWS Cost Management

- **Reserved Instances**: For predictable workloads
- **Auto Scaling**: Scale down during low traffic
- **Storage Optimization**: Use appropriate RDS instance sizes
- **Monitoring**: Set up billing alerts

### Development Costs

- **Local Development**: Use Docker for consistent environments
- **CI/CD**: Automate testing and deployment
- **Code Quality**: Prevent bugs that increase maintenance costs

---

For additional support or questions about setup and deployment, please contact the ShopXperience DevOps team or refer to the comprehensive online documentation.