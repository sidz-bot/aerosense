# AeroSense Backend - Railway Deployment Guide

## Quick Start (CLI Method)

### Prerequisites
- Railway account (free at railway.app)
- Railway CLI installed: `npm install -g @railway/cli`
- Git initialized

### Step-by-Step Deployment

```bash
# Step 1: Login to Railway
railway login

# Step 2: Navigate to backend
cd C:/aerosense/backend

# Step 3: Initialize project
railway init

# Step 4: Add PostgreSQL (database)
railway add postgresql

# Step 5: Add Redis (caching)
railway add redis

# Step 6: Set environment variables
railway variables set JWT_SECRET="$(openssl rand -base64 32)"
railway variables set NODE_ENV="production"
railway variables set PORT="3000"
railway variables set ENABLE_SWAGGER="true"

# Step 7: Deploy
railway up

# Step 8: Run database migrations
railway run npx prisma migrate deploy

# Step 9: Generate Prisma client
railway run npx prisma generate
```

### Verify Deployment

After deployment completes, get your API URL:
```bash
railway domain
```

Test the health endpoint:
```bash
curl https://your-app.railway.app/health
```

Access API documentation:
```
https://your-app.railway.app/docs
```

### Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | Auto-set by Railway PostgreSQL | ✅ | - |
| `REDIS_URL` | Auto-set by Railway Redis | ✅ | - |
| `JWT_SECRET` | JWT signing secret | ✅ | - |
| `NODE_ENV` | Environment | ✅ | `production` |
| `PORT` | Server port | ✅ | `3000` |
| `ENABLE_SWAGGER` | Enable API docs | ❌ | `true` |

### Troubleshooting

**Migration failed?**
```bash
railway run npx prisma migrate reset
railway run npx prisma migrate deploy
```

**View logs:**
```bash
railway logs
```

**Open dashboard:**
```bash
railway open
```

### Railway Free Tier Limits

- $5 free credit/month
- PostgreSQL: 512MB storage
- Redis: 256MB storage
- 512MB RAM
- Sufficient for development and testing!

## Web UI Alternative

If CLI doesn't work, use the web interface:

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Choose repository
5. Add PostgreSQL plugin
6. Add Redis plugin
7. Set environment variables in Variables tab
8. Click "Deploy"
