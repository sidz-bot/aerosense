#!/bin/bash
# AeroSense Secret Generator
# Generates secure random secrets for production use
# Run this script locally - NEVER commit generated secrets

set -e

echo "=========================================="
echo "  AeroSense Secret Generator"
echo "=========================================="
echo ""
echo "This script generates secure random secrets for production."
echo "Store these securely in AWS Secrets Manager, not in git."
echo ""

# Function to generate secret
generate_secret() {
    local name=$1
    local description=$2
    local method=$3

    echo "Generating: $description"
    echo "  Command: $method"
    SECRET=$(eval $method)
    echo "  Secret: ${SECRET:0:20}..."
    echo ""

    # Save to temporary file (never commit this)
    echo "$name=$SECRET" >> .secrets.generated
}

# Create/clear secrets file
> .secrets.generated
chmod 600 .secrets.generated

echo "=========================================="
echo "  Generating Secrets"
echo "=========================================="
echo ""

# JWT Secret (32 bytes base64)
generate_secret "JWT_SECRET" "JWT signing secret (32 bytes)" "openssl rand -base64 32"

# Database Password (25 chars alphanumeric)
generate_secret "DB_PASSWORD" "Database password (25 chars)" "openssl rand -base64 24 | tr -d '=+/' | cut -c1-25"

# Redis Auth Token (32 bytes base64)
generate_secret "REDIS_AUTH_TOKEN" "Redis auth token (32 bytes)" "openssl rand -base64 32"

# API Key (if needed)
generate_secret "API_KEY" "Generic API key (32 hex chars)" "openssl rand -hex 16"

echo "=========================================="
echo "  AWS Secrets Manager Commands"
echo "=========================================="
echo ""
echo "Copy these commands to store secrets in AWS:"
echo ""

# Read generated secrets
source .secrets.generated

echo "# Store JWT Secret"
echo "aws secretsmanager create-secret \\"
echo "  --name aerosense/prod/jwt-secret \\"
echo "  --description \"JWT signing secret for AeroSense production\" \\"
echo "  --secret-string \"$JWT_SECRET\""
echo ""

echo "# Store Database Password"
echo "aws secretsmanager create-secret \\"
echo "  --name aerosense/prod/db-password \\"
echo "  --description \"Database password for AeroSense production RDS\" \\"
echo "  --secret-string \"$DB_PASSWORD\""
echo ""

echo "# Store Redis Auth Token"
echo "aws secretsmanager create-secret \\"
echo "  --name aerosense/prod/redis-auth \\"
echo "  --description \"Redis auth token for AeroSense production ElastiCache\" \\"
echo "  --secret-string \"$REDIS_AUTH_TOKEN\""
echo ""

echo "# Store API Key (if needed)"
echo "aws secretsmanager create-secret \\"
echo "  --name aerosense/prod/flightaware-api-key \\"
echo "  --description \"FlightAware API key for production\" \\"
echo "  --secret-string \"$API_KEY\""
echo ""

echo "=========================================="
echo "  ECS Task Definition Reference"
echo "=========================================="
echo ""
echo "Add to your ECS task definition secrets array:"
echo ""
echo '{'
echo '  "secrets": ['
echo '    {'
echo "      \"name\": \"JWT_SECRET\","
echo "      \"valueFrom\": \"arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:aerosense/prod/jwt-secret:full\""
echo '    },'
echo '    {'
echo "      \"name\": \"DATABASE_URL\","
echo "      \"valueFrom\": \"arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:aerosense/prod/database-url:full\""
echo '    }'
echo '  ]'
echo '}'
echo ""

echo "=========================================="
echo "  Generated Secrets File"
echo "=========================================="
echo ""
echo "Secrets saved to: .secrets.generated"
echo "⚠️  WARNING: Never commit .secrets.generated to git!"
echo "⚠️  WARNING: Add .secrets.generated to .gitignore!"
echo ""
echo "To view all generated secrets:"
echo "  cat .secrets.generated"
echo ""

echo "=========================================="
echo "  Cleanup Instructions"
echo "=========================================="
echo ""
echo "After storing secrets in AWS Secrets Manager:"
echo "  shred -u .secrets.generated"
echo ""
