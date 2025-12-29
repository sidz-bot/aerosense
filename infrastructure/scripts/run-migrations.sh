#!/bin/bash
# AeroSense Database Migration Script
# Runs Prisma database migrations after infrastructure deployment
#
# Prerequisites:
# - Infrastructure deployed with Terraform
# - Terraform outputs available (infra-outputs-{env}.json)
# - Node.js and npm installed
# - Docker installed (for container-based migration)
#
# Usage:
#   ./run-migrations.sh [environment]
#
# Environments:
#   dev     - Development environment
#   staging - Staging environment
#   prod    - Production environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/../backend"
ENVIRONMENT=${1:-staging}
OUTPUTS_FILE="$PROJECT_ROOT/../infra-outputs-${ENVIRONMENT}.json"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'${NC}"
    echo "Valid options: dev, staging, prod"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  AeroSense Database Migrations${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Environment: ${GREEN}${ENVIRONMENT}${NC}"
echo ""

# Check if outputs file exists
if [ ! -f "$OUTPUTS_FILE" ]; then
    echo -e "${RED}✗ Terraform outputs file not found${NC}"
    echo "Expected: $OUTPUTS_FILE"
    echo ""
    echo "Please run infrastructure deployment first:"
    echo "  ./deploy-infrastructure.sh ${ENVIRONMENT}"
    exit 1
fi

# Parse outputs
if ! command -v jq &> /dev/null; then
    echo -e "${RED}✗ jq not installed${NC}"
    echo "Install: apt-get install jq (Ubuntu) or brew install jq (macOS)"
    exit 1
fi

echo "Reading Terraform outputs..."
DB_ENDPOINT=$(jq -r '.rds_endpoint.value' "$OUTPUTS_FILE")
DB_NAME=$(jq -r '.db_name.value' "$OUTPUTS_FILE")
DB_USER=$(jq -r '.db_user.value' "$OUTPUTS_FILE")
REDIS_ENDPOINT=$(jq -r '.redis_endpoint.value' "$OUTPUTS_FILE")

if [ -z "$DB_ENDPOINT" ] || [ "$DB_ENDPOINT" = "null" ]; then
    echo -e "${RED}✗ Failed to parse database endpoint from outputs${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Database endpoint: $DB_ENDPOINT"
echo -e "${GREEN}✓${NC} Database name: $DB_NAME"
echo ""

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}✗ Backend directory not found${NC}"
    echo "Expected: $BACKEND_DIR"
    exit 1
fi

# =============================================================================
# Migration Method Selection
# =============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Migration Method${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Select migration method:"
echo "  1) Local (requires database connectivity from local machine)"
echo "  2) Docker container (recommended - runs migration in ECS context)"
echo ""
read -p "Select method [1-2]: " -r
echo ""

case "$REPLY" in
  1)
    # Local migration
    echo -e "${BLUE}Running local migration...${NC}"
    echo ""

    cd "$BACKEND_DIR"

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm ci
    fi

    # Get database password from user
    echo ""
    echo "Database password required for connection"
    read -s -p "Enter database password: " DB_PASSWORD
    echo ""

    # Construct DATABASE_URL
    DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_ENDPOINT}:5432/${DB_NAME}?schema=public&sslmode=require"

    # Run Prisma commands
    echo "Generating Prisma client..."
    DATABASE_URL="$DATABASE_URL" npx prisma generate

    echo ""
    echo "Running migrations..."
    DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy

    echo ""
    echo -e "${GREEN}✓${NC} Migrations completed successfully"
    ;;

  2)
    # Docker container migration
    echo -e "${BLUE}Running Docker container migration...${NC}"
    echo ""

    # Get database password from Secrets Manager
    echo "Fetching database password from AWS Secrets Manager..."
    DB_SECRET_NAME="aerosense/${ENVIRONMENT}/db-password"

    if ! command -v aws &> /dev/null; then
        echo -e "${RED}✗ AWS CLI not installed${NC}"
        exit 1
    fi

    DB_PASSWORD=$(aws secretsmanager get-secret-value \
        --secret-id "$DB_SECRET_NAME" \
        --query SecretString \
        --output text \
        --no-cli-pager 2>/dev/null || echo "")

    if [ -z "$DB_PASSWORD" ]; then
        echo -e "${YELLOW}⚠ Failed to fetch password from Secrets Manager${NC}"
        echo "Enter database password manually:"
        read -s -p "Password: " DB_PASSWORD
        echo ""
    fi

    # Construct DATABASE_URL
    DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_ENDPOINT}:5432/${DB_NAME}?schema=public&sslmode=require"

    # Build migration image
    echo "Building migration Docker image..."
    cd "$BACKEND_DIR"
    docker build -t aerosense-migrate:latest -f - . << EOF
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
ENTRYPOINT ["npx", "prisma"]
EOF

    # Run migration container
    echo "Running migration container..."
    docker run --rm \
        -e DATABASE_URL="$DATABASE_URL" \
        aerosense-migrate:latest \
        migrate deploy

    echo ""
    echo -e "${GREEN}✓${NC} Migrations completed successfully"

    # Clean up image
    echo "Cleaning up migration image..."
    docker rmi aerosense-migrate:latest
    ;;

  *)
    echo -e "${RED}Invalid selection${NC}"
    exit 1
    ;;
esac

echo ""

# =============================================================================
# Seed Data (Optional)
# =============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Seed Data${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
read -p "Seed database with initial data? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Seeding database..."
    cd "$BACKEND_DIR"

    # For local method
    if [ "$REPLY_METHOD" = "1" ]; then
        DATABASE_URL="$DATABASE_URL" npx prisma db seed
    # For docker method
    else
        docker run --rm \
            -e DATABASE_URL="$DATABASE_URL" \
            aerosense-migrate:latest \
            db seed
    fi

    echo -e "${GREEN}✓${NC} Seed data inserted successfully"
fi

echo ""

# =============================================================================
# Verification
# =============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Checking database schema..."

if [ "$REPLY_METHOD" = "1" ]; then
    cd "$BACKEND_DIR"
    DATABASE_URL="$DATABASE_URL" npx prisma db pull --schema=./prisma/schema.prisma
else
    docker run --rm \
        -e DATABASE_URL="$DATABASE_URL" \
        aerosense-migrate:latest \
        db pull --schema=./prisma/schema.prisma
fi

echo -e "${GREEN}✓${NC} Database schema verified"
echo ""

# =============================================================================
# Summary
# =============================================================================
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Migration Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Database is ready for deployment."
echo ""
echo "Connection details:"
echo "  Host: $DB_ENDPOINT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  SSL: required"
echo ""
echo "Next steps:"
echo "  1. Deploy backend application to ECS"
echo "  2. Run smoke tests against deployed environment"
echo "  3. Monitor CloudWatch logs for any issues"
echo ""
