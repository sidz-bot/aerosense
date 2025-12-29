#!/bin/bash
# AeroSense One-Time Infrastructure Setup
# This script creates the foundational AWS resources needed for Terraform deployment
#
# Prerequisites:
# - AWS CLI installed and configured
# - AWS credentials with appropriate permissions
# - AWS Region configured
#
# Usage:
#   ./one-time-setup.sh
#
# Resources Created:
#   - S3 bucket for Terraform state storage
#   - DynamoDB table for Terraform state locking
#   - ECR repository for Docker images

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

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  AeroSense One-Time Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "This script creates foundational AWS resources for Terraform deployment."
echo "These resources only need to be created ONCE for the entire project."
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

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}✗ AWS credentials not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi
echo -e "${GREEN}✓${NC} AWS credentials configured"

# Get AWS account ID and region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --no-cli-pager)
echo -e "${GREEN}✓${NC} AWS Account: $AWS_ACCOUNT_ID"

AWS_REGION=$(aws configure get region || echo "us-east-1")
echo -e "${GREEN}✓${NC} AWS Region: $AWS_REGION"

echo ""

# Resource names
STATE_BUCKET="aerosense-terraform-state"
LOCK_TABLE="aerosense-terraform-locks"
ECR_REPO="aerosense-backend"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Resources to Create${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "1. S3 Bucket: ${STATE_BUCKET}"
echo "   Purpose: Store Terraform state files"
echo "   Region: ${AWS_REGION}"
echo ""
echo "2. DynamoDB Table: ${LOCK_TABLE}"
echo "   Purpose: Terraform state locking"
echo "   Region: ${AWS_REGION}"
echo ""
echo "3. ECR Repository: ${ECR_REPO}"
echo "   Purpose: Store Docker container images"
echo "   Region: ${AWS_REGION}"
echo ""

# Confirm
read -p "Continue with resource creation? (yes/no): " -r
echo

if [ "$REPLY" != "yes" ]; then
    echo "Setup cancelled"
    exit 0
fi

# =============================================================================
# STEP 1: Create S3 Bucket for Terraform State
# =============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 1: Create S3 Bucket${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if bucket already exists
if aws s3 ls "s3://${STATE_BUCKET}" --region "$AWS_REGION" &> /dev/null; then
    echo -e "${YELLOW}⚠ S3 bucket ${STATE_BUCKET} already exists${NC}"
    read -p "Recreate bucket? This will delete all existing state! (yes/no): " -r
    echo
    if [ "$REPLY" = "yes" ]; then
        echo "Emptying and deleting existing bucket..."
        aws s3 rm "s3://${STATE_BUCKET}" --recursive --region "$AWS_REGION" || true
        aws s3api delete-bucket --bucket "$STATE_BUCKET" --region "$AWS_REGION" || true
    else
        echo "Skipping bucket creation"
    fi
fi

# Create bucket (handle us-east-1 special case)
if ! aws s3 ls "s3://${STATE_BUCKET}" --region "$AWS_REGION" 2>&1 | grep -q 'An error occurred'; then
    echo "Creating S3 bucket: ${STATE_BUCKET}..."

    if [ "$AWS_REGION" = "us-east-1" ]; then
        # us-east-1 doesn't support LocationConstraint
        aws s3api create-bucket \
            --bucket "$STATE_BUCKET" \
            --region "$AWS_REGION"
    else
        # Other regions require LocationConstraint
        aws s3api create-bucket \
            --bucket "$STATE_BUCKET" \
            --region "$AWS_REGION" \
            --create-bucket-configuration LocationConstraint="$AWS_REGION"
    fi

    # Enable versioning
    echo "Enabling versioning..."
    aws s3api put-bucket-versioning \
        --bucket "$STATE_BUCKET" \
        --versioning-configuration Status=Enabled \
        --region "$AWS_REGION"

    # Enable default encryption
    echo "Enabling default encryption..."
    aws s3api put-bucket-encryption \
        --bucket "$STATE_BUCKET" \
        --server-side-encryption-configuration '{
            "Rules": [
                {
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }
            ]
        }' \
        --region "$AWS_REGION"

    # Block public access
    echo "Blocking public access..."
    aws s3api put-public-access-block \
        --bucket "$STATE_BUCKET" \
        --public-access-block-configuration '{
            "BlockPublicAcls": true,
            "IgnorePublicAcls": true,
            "BlockPublicPolicy": true,
            "RestrictPublicBuckets": true
        }' \
        --region "$AWS_REGION"

    # Add lifecycle policy to delete old versions after 90 days
    echo "Adding lifecycle policy..."
    aws s3api put-bucket-lifecycle-configuration \
        --bucket "$STATE_BUCKET" \
        --lifecycle-configuration '{
            "Rules": [
                {
                    "Id": "DeleteOldVersions",
                    "Status": "Enabled",
                    "NoncurrentVersionExpiration": {
                        "NoncurrentDays": 90
                    },
                    "AbortIncompleteMultipartUpload": {
                        "DaysAfterInitiation": 7
                    }
                }
            ]
        }' \
        --region "$AWS_REGION"

    echo -e "${GREEN}✓${NC} S3 bucket created successfully"
else
    echo -e "${YELLOW}⚠ S3 bucket already exists, skipping${NC}"
fi

echo ""

# =============================================================================
# STEP 2: Create DynamoDB Table for State Locking
# =============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 2: Create DynamoDB Table${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if table already exists
if aws dynamodb describe-table \
    --table-name "$LOCK_TABLE" \
    --region "$AWS_REGION" &> /dev/null; then
    echo -e "${YELLOW}⚠ DynamoDB table ${LOCK_TABLE} already exists${NC}"
    read -p "Recreate table? This will delete all existing locks! (yes/no): " -r
    echo
    if [ "$REPLY" = "yes" ]; then
        echo "Deleting existing table..."
        aws dynamodb delete-table \
            --table-name "$LOCK_TABLE" \
            --region "$AWS_REGION"
        echo "Waiting for table deletion..."
        aws dynamodb wait table-not-exists \
            --table-name "$LOCK_TABLE" \
            --region "$AWS_REGION"
    else
        echo "Skipping table creation"
    fi
fi

# Create table
if ! aws dynamodb describe-table \
    --table-name "$LOCK_TABLE" \
    --region "$AWS_REGION" &> /dev/null; then
    echo "Creating DynamoDB table: ${LOCK_TABLE}..."

    aws dynamodb create-table \
        --table-name "$LOCK_TABLE" \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region "$AWS_REGION"

    echo "Waiting for table to become active..."
    aws dynamodb wait table-exists \
        --table-name "$LOCK_TABLE" \
        --region "$AWS_REGION"

    # Enable point-in-time recovery
    echo "Enabling point-in-time recovery..."
    aws dynamodb update-continuous-backups \
        --table-name "$LOCK_TABLE" \
        --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
        --region "$AWS_REGION"

    echo -e "${GREEN}✓${NC} DynamoDB table created successfully"
else
    echo -e "${YELLOW}⚠ DynamoDB table already exists, skipping${NC}"
fi

echo ""

# =============================================================================
# STEP 3: Create ECR Repository
# =============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 3: Create ECR Repository${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if repository already exists
if aws ecr describe-repositories \
    --repository-names "$ECR_REPO" \
    --region "$AWS_REGION" &> /dev/null; then
    echo -e "${YELLOW}⚠ ECR repository ${ECR_REPO} already exists${NC}"
    read -p "Recreate repository? This will delete all existing images! (yes/no): " -r
    echo
    if [ "$REPLY" = "yes" ]; then
        echo "Deleting existing repository..."
        aws ecr delete-repository \
            --repository-name "$ECR_REPO" \
            --force \
            --region "$AWS_REGION"
    else
        echo "Skipping repository creation"
    fi
fi

# Create repository
if ! aws ecr describe-repositories \
    --repository-names "$ECR_REPO" \
    --region "$AWS_REGION" &> /dev/null; then
    echo "Creating ECR repository: ${ECR_REPO}..."

    aws ecr create-repository \
        --repository-name "$ECR_REPO" \
        --image-scanning-configuration scanOnPush=true \
        --region "$AWS_REGION"

    # Add lifecycle policy to keep only last 10 images
    echo "Adding lifecycle policy..."
    aws ecr put-lifecycle-policy \
        --repository-name "$ECR_REPO" \
        --lifecycle-policy-text '{
            "rules": [
                {
                    "rulePriority": 1,
                    "description": "Keep only last 10 images",
                    "selection": {
                        "tagStatus": "any",
                        "countType": "imageCountMoreThan",
                        "countNumber": 10
                    },
                    "action": {
                        "type": "expire"
                    }
                }
            ]
        }' \
        --region "$AWS_REGION"

    echo -e "${GREEN}✓${NC} ECR repository created successfully"
    echo ""
    echo "Repository URI: ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"
else
    echo -e "${YELLOW}⚠ ECR repository already exists, skipping${NC}"
fi

echo ""

# =============================================================================
# STEP 4: Create Backend Configuration
# =============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 4: Create Backend Config${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

BACKEND_FILE="$PROJECT_ROOT/terraform/backend.tf"

if [ -f "$BACKEND_FILE" ]; then
    echo -e "${YELLOW}⚠ backend.tf already exists${NC}"
    read -p "Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping backend config creation"
    fi
fi

# Create backend config if it doesn't exist or was confirmed to overwrite
if [[ ! -f "$BACKEND_FILE" ]] || [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Creating backend.tf..."

    cat > "$BACKEND_FILE" << EOF
# Terraform Backend Configuration
# This configures Terraform to store state in S3 with DynamoDB locking

terraform {
  backend "s3" {
    bucket         = "${STATE_BUCKET}"
    key            = "environments/\${terraform.workspace}/terraform.tfstate"
    region         = "${AWS_REGION}"
    encrypt        = true
    dynamodb_table = "${LOCK_TABLE}"

    # Locking prevents concurrent modifications
    # Enable with: terraform init -lock=true
  }

  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
EOF

    echo -e "${GREEN}✓${NC} Backend configuration created"
fi

echo ""

# =============================================================================
# Summary
# =============================================================================
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Resources created:"
echo "  ✓ S3 Bucket: s3://${STATE_BUCKET}"
echo "  ✓ DynamoDB Table: ${LOCK_TABLE}"
echo "  ✓ ECR Repository: ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"
echo "  ✓ Backend Config: terraform/backend.tf"
echo ""
echo "Next steps:"
echo "  1. Initialize Terraform for an environment:"
echo "     cd infrastructure/terraform"
echo "     terraform init"
echo ""
echo "  2. Deploy infrastructure:"
echo "     ../scripts/deploy-infrastructure.sh staging"
echo ""
echo "  3. After deployment, build and push Docker image:"
echo "     aws ecr get-login-password --region ${AWS_REGION} | \\"
echo "       docker login --username AWS --password-stdin \\"
echo "       ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
echo ""
echo "     docker build -t ${ECR_REPO}:latest ../backend"
echo "     docker tag ${ECR_REPO}:latest \\"
echo "       ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest"
echo "     docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest"
echo ""
