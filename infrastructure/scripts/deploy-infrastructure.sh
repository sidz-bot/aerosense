#!/bin/bash
# AeroSense Infrastructure Deployment Script
# This script deploys the complete AWS infrastructure for AeroSense
#
# Prerequisites:
# - AWS CLI installed and configured
# - Terraform installed
# - AWS credentials with appropriate permissions
# - S3 bucket and DynamoDB table created (see one-time-setup.sh)
#
# Usage:
#   ./deploy-infrastructure.sh [environment]
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
INFRA_DIR="$PROJECT_ROOT/infrastructure/terraform"
ENVIRONMENT=${1:-staging}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'"
    echo "Valid options: dev, staging, prod${NC}"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  AeroSense Infrastructure Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Environment: ${GREEN}$ENVIRONMENT${NC}"
echo "Project Root: $PROJECT_ROOT"
echo ""

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}✗ AWS CLI not installed${NC}"
    echo "Install from: https://aws.amazon.com/cli/"
    exit 1
fi
echo -e "${GREEN}✓${NC} AWS CLI installed"

# Check Terraform
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}✗ Terraform not installed${NC}"
    echo "Install from: https://www.terraform.io/downloads.html"
    exit 1
fi
echo -e "${GREEN}✓${NC} Terraform installed"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}✗ AWS credentials not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi
echo -e "${GREEN}✓${NC} AWS credentials configured"

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --no-cli-pager)
echo -e "${GREEN}✓${NC} AWS Account: $AWS_ACCOUNT_ID"

AWS_REGION=$(aws configure get region || echo "us-east-1")
echo -e "${GREEN}✓${NC} AWS Region: $AWS_REGION"

echo ""

# =============================================================================
# STEP 1: Generate Terraform Variables File
# =============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 1: Generate Terraform Variables${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

TFVARS_FILE="$INFRA_DIR/terraform.tfvars"

if [ -f "$TFVARS_FILE" ]; then
    echo -e "${YELLOW}⚠ ${TFVARS_FILE} already exists${NC}"
    read -p "Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing $TFVARS_FILE"
    else
        rm "$TFVARS_FILE"
    fi
fi

# Create terraform.tfvars if it doesn't exist
if [ ! -f "$TFVARS_FILE" ]; then
    echo "Creating $TFVARS_FILE..."

    # Generate secrets for this environment
    JWT_SECRET=$(openssl rand -base64 32)
    DB_PASSWORD=$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-25)
    REDIS_AUTH_TOKEN=$(openssl rand -base64 32)

    cat > "$TFVARS_FILE" << EOF
# Terraform Variables for AeroSense
# Environment: $ENVIRONMENT
# Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# ⚠️  WARNING: Contains secrets - DO NOT commit to git

# =============================================================================
# Environment Configuration
# =============================================================================
environment = "$ENVIRONMENT"
aws_region = "$AWS_REGION"
aws_account_id = "$AWS_ACCOUNT_ID"

# =============================================================================
# Database Configuration
# =============================================================================
db_name = "aerosense-${ENVIRONMENT}"
db_instance_class = "db.t3.micro"
db_allocated_storage = 20
db_max_allocated_storage = 100
db_multi_az = $([ "$ENVIRONMENT" == "prod" ] && echo "true" || echo "false")
db_backup_retention_period = $([ "$ENVIRONMENT" == "prod" ] && echo "30" || echo "7")

# Database Password
db_password = "$DB_PASSWORD"

# =============================================================================
# Redis Configuration
# =============================================================================
redis_node_count = $([ "$ENVIRONMENT" == "prod" ] && echo "3" || echo "1")
redis_instance_type = "cache.t3.micro"
redis_multi_az = $([ "$ENVIRONMENT" == "prod" ] && echo "true" || echo "false")
redis_snapshot_retention_limit = $([ "$ENVIRONMENT" == "prod" ] && echo "7" || echo "1")

# Redis Auth Token
redis_auth_token = "$REDIS_AUTH_TOKEN"

# =============================================================================
# ECS Configuration
# =============================================================================
ecs_cluster_name = "aerosense-${ENVIRONMENT}"
ecs_task_cpu = 256
ecs_task_memory = 512
ecs_task_desired_count = $([ "$ENVIRONMENT" == "prod" ] && echo "2" || echo "1")
ecs_task_max_count = $([ "$ENVIRONMENT" == "prod" ] && echo "10" || echo "3")
ecs_task_autoscaling_target_value = 70

# =============================================================================
# Application Configuration
# =============================================================================
docker_image = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/aerosense-backend:latest"
container_name = "aerosense-backend"
container_port = 3000

# JWT Secret (should be overridden by Secrets Manager in production)
jwt_secret = "$JWT_SECRET"

# =============================================================================
# ALB Configuration
# =============================================================================
alb_certificate_arn = ""  # Leave empty to use default ALB certificate
enable_route53 = false

# =============================================================================
# S3 Configuration
# =============================================================================
alb_logs_bucket = "aerosense-${ENVIRONMENT}-alb-logs"
alb_logs_retention_days = 30

# =============================================================================
# SQS Configuration
# =============================================================================
sqs_queue_name = "aerosense-${ENVIRONMENT}-notifications"
sqs_dlq_name = "aerosense-${ENVIRONMENT}-notifications-dlq"
sqs_message_retention_seconds = 1209600  # 14 days

# =============================================================================
# Tags
# =============================================================================
tags = {
  Project     = "AeroSense"
  Environment = "$ENVIRONMENT"
  ManagedBy   = "Terraform"
}
EOF

    chmod 600 "$TFVARS_FILE"
    echo -e "${GREEN}✓${NC} Created $TFVARS_FILE"
    echo ""
    echo "⚠️  IMPORTANT: Save these secrets to AWS Secrets Manager:"
    echo "   JWT_SECRET: ${JWT_SECRET:0:20}..."
    echo "   DB_PASSWORD: ${DB_PASSWORD:0:20}..."
    echo "   REDIS_AUTH_TOKEN: ${REDIS_AUTH_TOKEN:0:20}..."
    echo ""
fi

# =============================================================================
# STEP 2: Initialize Terraform Backend
# =============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 2: Initialize Terraform Backend${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

cd "$INFRA_DIR"

# Check if backend is already configured
if [ -f ".terraform/terraform.tfstate" ]; then
    echo -e "${YELLOW}⚠ Terraform backend already initialized${NC}"
    read -p "Re-initialize? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf .terraform
    fi
fi

# S3 Backend Configuration
STATE_BUCKET="aerosense-terraform-state"
LOCK_TABLE="aerosense-terraform-locks"

# Check if state bucket exists
if aws s3 ls "s3://$STATE_BUCKET" --region "$AWS_REGION" 2>&1 | grep -q 'An error occurred'; then
    echo -e "${YELLOW}⚠ State bucket does not exist${NC}"
    echo "Run one-time-setup.sh first to create backend resources"
    read -p "Create state bucket now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Creating S3 bucket for Terraform state..."
        aws s3api create-bucket \
            --bucket "$STATE_BUCKET" \
            --region "$AWS_REGION" \
            || echo "Bucket may already exist or error occurred"

        aws s3api put-bucket-versioning \
            --bucket "$STATE_BUCKET" \
            --versioning-configuration Status=Enabled

        echo "Creating DynamoDB table for state locking..."
        aws dynamodb create-table \
            --table-name "$LOCK_TABLE" \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --billing-mode PAY_PER_REQUEST \
            --region "$AWS_REGION" \
            2>/dev/null || echo "Table may already exist or error occurred"

        echo -e "${GREEN}✓${NC} Backend resources created"
    else
        echo "Skipping backend creation"
        echo "Run: ./scripts/one-time-setup.sh"
        exit 1
    fi
fi

# Initialize Terraform
echo "Initializing Terraform..."
terraform init \
    -backend-config="bucket=$STATE_BUCKET" \
    -backend-config="key=${ENVIRONMENT}/terraform.tfstate" \
    -backend-config="region=$AWS_REGION" \
    -backend-config="dynamodb_table=$LOCK_TABLE" \
    -upgrade=true

echo -e "${GREEN}✓${NC} Terraform initialized"
echo ""

# =============================================================================
# STEP 3: Terraform Format Check
# =============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 3: Format Check${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

terraform fmt -check
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Terraform files are properly formatted"
else
    echo -e "${YELLOW}⚠ Formatting issues found, fixing...${NC}"
    terraform fmt -recursive
fi
echo ""

# =============================================================================
# STEP 4: Terraform Validation
# =============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 4: Validate Configuration${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

terraform validate
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Configuration is valid"
else
    echo -e "${RED}✗ Configuration validation failed${NC}"
    exit 1
fi
echo ""

# =============================================================================
# STEP 5: Terraform Plan
# =============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 5: Generate Execution Plan${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo "Generating plan for ${GREEN}$ENVIRONMENT${NC} environment..."
terraform plan \
    -out=tfplan \
    -var-file="terraform.tfvars" \
    -out="tfplan-${ENVIRONMENT}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Plan generated successfully"
    echo "Review plan: terraform show tfplan-${ENVIRONMENT}"
else
    echo -e "${RED}✗ Plan generation failed${NC}"
    exit 1
fi
echo ""

# =============================================================================
# STEP 6: Confirm Deployment
# =============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 6: Deployment Confirmation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}⚠️  WARNING: This will deploy actual AWS resources${NC}"
echo -e "${YELLOW}           This will incur costs on your AWS account${NC}"
echo ""
echo "Resources to be created:"
echo "  - VPC with public/private subnets"
echo "  - ECS Fargate cluster"
echo "  - Application Load Balancer"
echo "  - RDS PostgreSQL database"
echo "  - ElastiCache Redis cluster"
echo "  - SQS queues"
echo "  - S3 buckets"
echo "  - CloudWatch Log Groups"
echo "  - IAM roles and policies"
echo ""
read -p "Continue with deployment? (yes/no): " -r
echo

if [ "$REPLY" != "yes" ]; then
    echo "Deployment cancelled"
    exit 0
fi

# =============================================================================
# STEP 7: Apply Infrastructure
# =============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 7: Deploy Infrastructure${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo "Deploying to ${GREEN}$ENVIRONMENT${NC}..."
terraform apply \
    -auto-approve \
    -var-file="terraform.tfvars" \
    tfplan

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Deployment Successful!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""

    # Show outputs
    echo "Infrastructure Outputs:"
    terraform output -json | jq -r 'to_entries[] | "\(.key | ascii_upcase): \(.value.value)"'

    echo ""
    echo "Next steps:"
    echo "  1. Save outputs for database migrations:"
    echo "     \$(terraform output -raw rds_endpoint)"
    echo "  2. Run database migrations"
    echo "  3. Deploy backend application"
    echo ""

    # Save outputs to file
    terraform output -json > "../../infra-outputs-${ENVIRONMENT}.json"
    echo "Outputs saved to: infra-outputs-${ENVIRONMENT}.json"

else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  Deployment Failed${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "Check the error messages above and run:"
    echo "  terraform plan"
    echo "  terraform apply"
    exit 1
fi
