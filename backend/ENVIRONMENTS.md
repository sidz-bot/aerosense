# AeroSense Environment Configuration Guide

**Version:** 1.0
**Last Updated:** December 29, 2025

---

## Overview

This document explains how to configure environment variables for the AeroSense backend across different environments (development, staging, production).

---

## 🚨 Security Rules

### CRITICAL - NEVER Commit These

```
❌ .env                    (local overrides)
❌ .env.production         (actual production values)
❌ .env.staging            (actual staging values)
❌ Any file with real secrets, passwords, or API keys
```

### SAFE to Commit

```
✅ .env.example            (template with placeholders)
✅ .env.development        (development defaults are OK)
✅ .env.test               (test values are OK)
✅ .env.production.template (template without actual secrets)
```

---

## Environment Files

| File | Purpose | Git Status |
|------|---------|------------|
| `.env.example` | Template for all environments | ✅ Committed |
| `.env.development` | Local development defaults | ✅ Committed |
| `.env.staging` | Staging environment template | ⚠️  Do NOT commit actual values |
| `.env.production.template` | Production template | ✅ Committed (no secrets) |
| `.env.test` | Test environment | ✅ Committed |
| `.env` | Local overrides (ignored by git) | ❌ Never commit |

---

## Quick Start

### For Local Development

```bash
cd backend

# Copy example file
cp .env.example .env

# Edit with your local values
nano .env

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate dev

# Start development server
npm run dev
```

### Required Environment Variables

The application **will not start** in production without these:

| Variable | Required | Notes |
|----------|----------|-------|
| `JWT_SECRET` | Yes | 32+ characters, random |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `CORS_ORIGIN` | Yes | Explicit origins (no wildcards in prod) |

---

## Secret Generation

### Generate Secure Secrets

Use these commands to generate production-grade secrets:

```bash
# JWT Secret (32 bytes, base64 encoded)
openssl rand -base64 32

# Database Password (25 chars, alphanumeric)
openssl rand -base64 24 | tr -d "=+/" | cut -c1-25

# Redis Auth Token (32 bytes, base64 encoded)
openssl rand -base64 32

# API Key (if service doesn't provide one)
openssl rand -hex 16
```

### Store Secrets Securely

**AWS Secrets Manager (Recommended for production):**

```bash
# Create secret for JWT
aws secretsmanager create-secret \
  --name aerosense/production/jwt-secret \
  --secret-string "$(openssl rand -base64 32)"

# Create secret for database
aws secretsmanager create-secret \
  --name aerosense/production/db-password \
  --secret-string "$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-25)"

# Create secret for Redis
aws secretsmanager create-secret \
  --name aerosense/production/redis-auth \
  --secret-string "$(openssl rand -base64 32)"
```

---

## Environment-Specific Setup

### Development

**Purpose:** Local development on your machine

```bash
# Use the development file directly
cp .env.development .env.local

# Edit FlightAware API key if you have one
nano .env.local

# Start development server
npm run dev
```

**Default Behavior:**
- ✅ Pretty logging enabled
- ✅ Swagger UI available at `/docs`
- ✅ Mock data used if no API key
- ✅ CORS allows localhost

### Staging

**Purpose:** Pre-production testing environment

```bash
# Copy staging template
cp .env.staging .env.staging.local

# Generate secure secrets
JWT_SECRET=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-25)
REDIS_TOKEN=$(openssl rand -base64 32)

# Replace placeholders in .env.staging.local
sed -i '' "s/CHANGE_ME_RDS_PRODUCTION_PASSWORD/$DB_PASSWORD/" .env.staging.local
sed -i '' "s/CHANGE_ME_GENERATE_SECURE_RANDOM_STRING_MIN_32_CHARS/$JWT_SECRET/" .env.staging.local
sed -i '' "s/CHANGE_ME_REDIS_AUTH_TOKEN/$REDIS_TOKEN/" .env.staging.local

# Add your FlightAware API key
nano .env.staging.local

# Deploy to staging
# (see Deployment Guide)
```

### Production

**Purpose:** Live production environment

**IMPORTANT:** Production secrets should be stored in **AWS Secrets Manager**, not in `.env` files.

**Option 1: AWS Secrets Manager (Recommended)**

```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name aerosense/prod/jwt-secret \
  --description "JWT signing secret for production" \
  --secret-string "YOUR_GENERATED_SECRET"

# Reference in ECS task definition
# Container environment variables will be sourced from Secrets Manager
```

**Option 2: ECS Task Definition Overrides**

```json
{
  "secrets": [
    {
      "name": "JWT_SECRET",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:aerosense/prod/jwt-secret:full"
    },
    {
      "name": "DATABASE_URL",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:aerosense/prod/database-url:full"
    }
  ]
}
```

**Option 3: S3 Parameter Store**

```bash
# Store encrypted parameters
aws ssm put-parameter \
  --name "/aerosense/production/jwt-secret" \
  --value "$(openssl rand -base64 32)" \
  --type "SecureString" \
  --overwrite
```

---

## Environment Variables Reference

### Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |

### Database

| Variable | Required | Format |
|----------|----------|--------|
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:port/db?schema=public` |
| `DATABASE_POOL_SIZE` | No | Connection pool size (default: 10) |
| `DATABASE_CONNECTION_TIMEOUT` | No | Connection timeout in seconds (default: 30) |

### Redis

| Variable | Required | Format |
|----------|----------|--------|
| `REDIS_URL` | No | `redis://host:port` or `rediss://host:port` (TLS) |
| `REDIS_PASSWORD` | No | Password if authentication enabled |
| `REDIS_TTL` | No | Cache TTL in seconds (default: 60) |
| `REDIS_MAX_RETRIES` | No | Retry attempts (default: 3) |

### JWT Authentication

| Variable | Required | Notes |
|----------|----------|-------|
| `JWT_SECRET` | Yes (prod) | 32+ characters, random, HIGH ENTROPY |
| `JWT_EXPIRES_IN` | No | Access token lifetime (default: 15m) |
| `REFRESH_TOKEN_EXPIRES_IN` | No | Refresh token lifetime (default: 30d) |

### FlightAware API

| Variable | Required | Notes |
|----------|----------|-------|
| `FLIGHTAWARE_API_KEY` | No | Leave empty to use mock data |
| `FLIGHTAWARE_API_BASE` | No | API endpoint URL |

### CORS

| Variable | Required | Production Notes |
|----------|----------|-------------------|
| `CORS_ORIGIN` | Yes | Comma-separated origins, NO wildcard in production |

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `FREE_RATE_LIMIT` | 100 | Requests per hour for free tier |
| `PREMIUM_RATE_LIMIT` | 1000 | Requests per hour for premium |
| `RATE_LIMIT_WINDOW` | 3600000 | Window size in milliseconds (1 hour) |

### Feature Flags

| Variable | Default | Notes |
|----------|---------|-------|
| `ENABLE_SWAGGER` | `false` | API documentation at `/docs` |
| `ENABLE_REQUEST_LOGGING` | `false` | Log all HTTP requests |
| `USE_MOCK_FLIGHT_DATA` | `false` | Use mock data instead of API |

---

## Validation

### Production Startup Validation

The application will **fail to start** in production if:

```bash
# Check if these are set
NODE_ENV=production

# Required variables checked:
- JWT_SECRET (must be non-empty)
- DATABASE_URL (must be valid PostgreSQL URL)
- CORS_ORIGIN (must not be wildcard '*')
```

**Error message if validation fails:**

```
CRITICAL: Missing required environment variables for production: JWT_SECRET, DATABASE_URL
Set these in your environment or .env file before starting the server.
```

---

## Docker/Container Environment Variables

When running in Docker (ECS Fargate), pass environment variables:

### docker-compose.yml Example

```yaml
version: '3.8'
services:
  backend:
    image: aerosense-backend:latest
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - CORS_ORIGIN=${CORS_ORIGIN}
```

### ECS Task Definition Example

```json
{
  "family": "aerosense-backend",
  "containerDefinitions": [
    {
      "name": "aerosense-backend",
      "image": "ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/aerosense-backend:latest",
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:aerosense/prod/jwt-secret"
        }
      ]
    }
  ]
}
```

---

## Troubleshooting

### "Missing required environment variables"

**Cause:** Required variable not set

**Solution:**
```bash
# Check what's missing
echo $JWT_SECRET
echo $DATABASE_URL

# Set the variable
export JWT_SECRET="your-secret-here"
```

### "CORS_ORIGIN must be set in production"

**Cause:** Wildcard CORS not allowed in production

**Solution:**
```bash
# Set explicit origins
export CORS_ORIGIN="https://aerosense.app,https://www.aerosense.app"
```

### Database Connection Failed

**Cause:** Invalid DATABASE_URL format

**Solution:**
```bash
# Correct format
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
# Or with SSL
DATABASE_URL="postgresql://user:password@host:port/database?schema=public&sslmode=require"
```

### Redis Connection Failed

**Cause:** Invalid REDIS_URL or missing password

**Solution:**
```bash
# Standard format
REDIS_URL="redis://localhost:6379"
# With password
REDIS_URL="redis://:password@localhost:6379"
# With TLS
REDIS_URL="rediss://:password@host:6379"
```

---

## Security Checklist

Before deploying to production, verify:

- [ ] All secrets are 32+ characters with high entropy
- [ ] JWT_SECRET is random and unique
- [ ] DATABASE_PASSWORD is strong (25+ chars)
- [ ] CORS_ORIGIN contains only actual production domains
- [ ] No environment variables are committed to git
- [ ] Secrets stored in AWS Secrets Manager
- [ ] AWS Secrets Manager encrypted with KMS
- [ ] IAM roles follow least-privilege principle
- [ ] Database uses SSL (sslmode=require)
- [ ] Redis uses TLS (rediss:// URL)

---

## Maintenance

### Secret Rotation

**Recommended Schedule:** Quarterly (every 3 months)

**JWT Secret Rotation:**
```bash
# Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# Update in AWS Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id aerosense/prod/jwt-secret \
  --secret-string "$NEW_SECRET"

# Deploy with grace period for old tokens
```

**Database Password Rotation:**
```bash
# Generate new password
NEW_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-25)

# Update in RDS
aws rds modify-db-instance \
  --db-instance-identifier aerosense-db-production \
  --master-user-password "$NEW_PASSWORD"

# Update Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id aerosense/prod/db-password \
  --secret-string "$NEW_PASSWORD"
```

---

**End of Environment Configuration Guide**

For questions or issues, refer to:
- Backend README: `backend/README.md`
- Architecture Docs: `docs/05-architecture/`
- Infrastructure Guide: `infrastructure/terraform/README.md`
