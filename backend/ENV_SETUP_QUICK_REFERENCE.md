# 📋 Environment Templates — Quick Reference

**Generated:** December 29, 2025
**Component:** Backend Environment Configuration

---

## Files Created

| File | Purpose | Action Required |
|------|---------|-----------------|
| `.env.development` | Local development defaults | ✅ Ready to use |
| `.env.staging` | Staging environment template | ⚠️ Replace CHANGE_ME values |
| `.env.production.template` | Production template | ⚠️ Read deployment guide |
| `.env.test` | Automated testing | ✅ Ready to use |
| `scripts/generate-secrets.sh` | Secret generator | ✅ Run to generate secrets |
| `ENVIRONMENTS.md` | Full documentation | Read for setup instructions |

---

## Quick Start

### Local Development

```bash
cd backend

# Use development defaults directly
cp .env.development .env

# Start dev server
npm run dev
```

### Generate Production Secrets

```bash
cd backend

# Run secret generator
./scripts/generate-secrets.sh

# This creates .secrets.generated
# Store these in AWS Secrets Manager (not in git)
```

### Setup Staging

```bash
cd backend

# 1. Generate secrets
./scripts/generate-secrets.sh

# 2. Copy staging template
cp .env.staging .env.staging.local

# 3. Replace placeholders with generated secrets
# (Manual or use sed commands from script output)

# 4. Deploy to staging
```

---

## Security Reminders

### ✅ SAFE to Commit

```
✅ .env.example
✅ .env.development
✅ .env.test
✅ .env.production.template (no actual secrets)
✅ .gitignore (updated)
```

### ❌ NEVER Commit

```
❌ .env
❌ .env.local
❌ .env.production
❌ .env.staging.local
❌ .secrets.generated
❌ Any file with real passwords, keys, or tokens
```

---

## Environment Variables at a Glance

### Required for Production (app won't start without these)

| Variable | Purpose | Example |
|----------|---------|---------|
| `JWT_SECRET` | JWT signing | 32+ random characters |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://...` |
| `CORS_ORIGIN` | Allowed origins | `https://aerosense.app` |

### Optional (has safe defaults)

| Variable | Default | Notes |
|----------|---------|-------|
| `PORT` | 3000 | Server port |
| `LOG_LEVEL` | info | debug, info, warn, error |
| `REDIS_TTL` | 60 | Cache TTL in seconds |
| `ENABLE_SWAGGER` | false | API docs |

---

## Secret Generation Commands

```bash
# JWT Secret (32 bytes, base64)
openssl rand -base64 32

# Database Password (25 chars)
openssl rand -base64 24 | tr -d '=+/' | cut -c1-25

# Redis Auth Token (32 bytes)
openssl rand -base64 32

# Generic API Key (32 hex chars)
openssl rand -hex 16
```

---

## AWS Secrets Manager Commands

```bash
# JWT Secret
aws secretsmanager create-secret \
  --name aerosense/prod/jwt-secret \
  --secret-string "YOUR_SECRET_HERE"

# Database Password
aws secretsmanager create-secret \
  --name aerosense/prod/db-password \
  --secret-string "YOUR_PASSWORD_HERE"

# Redis Auth Token
aws secretsmanager create-secret \
  --name aerosense/prod/redis-auth \
  --secret-string "YOUR_TOKEN_HERE"
```

---

## ECS Task Definition Secret Reference

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
    },
    {
      "name": "REDIS_URL",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:aerosense/prod/redis-url:full"
    }
  ]
}
```

---

## Validation Checklist

Before deploying to production, verify:

- [ ] All CHANGE_ME placeholders replaced with actual values
- [ ] JWT_SECRET is 32+ characters, randomly generated
- [ ] Database password is 25+ characters, strong
- [ ] CORS_ORIGIN contains only actual production domains (no wildcards)
- [ ] No .env.production file exists (use template + AWS Secrets)
- [ ] Secrets stored in AWS Secrets Manager
- [ ] .gitignore updated to exclude sensitive files
- [ ] Generated secrets file deleted after AWS setup

---

## Full Documentation

See `ENVIRONMENTS.md` for:
- Complete variable reference
- Docker/ECS configuration
- Troubleshooting guide
- Security checklist
- Secret rotation procedures

---

## Next Steps

1. ✅ Environment templates created
2. 📖 Read `ENVIRONMENTS.md` for setup guide
3. 🔐 Run `./scripts/generate-secrets.sh` to generate secrets
4. ☁️ Store secrets in AWS Secrets Manager
5. 🚀 Deploy infrastructure with Terraform
6. 🚀 Deploy backend via CI/CD

---

**End of Quick Reference**

For detailed instructions, see: `backend/ENVIRONMENTS.md`
