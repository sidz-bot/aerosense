# =============================================================================
# AeroSense AWS Infrastructure - Terraform Configuration
# =============================================================================
# This Terraform configuration defines the complete AWS infrastructure
# for the AeroSense application.
#
# Architecture Overview:
# - VPC with public/private subnets across 3 AZs
# - ECS Fargate for containerized backend
# - RDS PostgreSQL for primary database
# - ElastiCache Redis for caching layer
# - Application Load Balancer for traffic distribution
# - SQS queues for async notification processing
# - S3 for static assets and logs
# - CloudWatch for monitoring and alerting
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "aerosense-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "aerosense-terraform-locks"
  }
}

# =============================================================================
# Provider Configuration
# =============================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "AeroSense"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# =============================================================================
# Local Variables
# =============================================================================

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  # VPC CIDR blocks
  vpc_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

# =============================================================================
# VPC Module
# =============================================================================

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = local.name_prefix
  cidr = local.vpc_cidr

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  public_subnets  = local.public_subnet_cidrs
  private_subnets = local.private_subnet_cidrs

  enable_nat_gateway   = true
  single_nat_gateway   = var.environment == "dev" # Cost optimization for dev
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Database subnets (isolated)
  database_subnets = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]

  # Redwood subnets
  elasticache_subnets = ["10.0.31.0/24", "10.0.32.0/24", "10.0.33.0/24"]

  public_subnet_tags = {
    Tier = "public"
  }

  private_subnet_tags = {
    Tier = "private"
  }

  database_subnet_tags = {
    Tier = "database"
  }

  elasticache_subnet_tags = {
    Tier = "cache"
  }

  tags = local.common_tags
}

# =============================================================================
# Security Groups
# =============================================================================

resource "aws_security_group" "ecs_tasks" {
  name_prefix = "${local.name_prefix}-ecs-tasks-"
  description = "Security group for ECS tasks"
  vpc_id      = module.vpc.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags
}

resource "aws_security_group" "alb" {
  name_prefix = "${local.name_prefix}-alb-"
  description = "Security group for ALB"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags
}

resource "aws_security_group_rule" "alb_to_ecs" {
  type                     = "ingress"
  from_port                = var.backend_port
  to_port                  = var.backend_port
  protocol                 = "tcp"
  security_group_id        = aws_security_group.ecs_tasks.id
  source_security_group_id = aws_security_group.alb.id
}

# =============================================================================
# Application Load Balancer
# =============================================================================

resource "aws_lb" "main" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets

  enable_deletion_protection = var.environment == "prod"

  access_logs {
    bucket  = aws_s3_bucket.logs.id
    prefix  = "alb-logs"
    enabled = true
  }

  tags = local.common_tags
}

resource "aws_lb_target_group" "backend" {
  name        = "${local.name_prefix}-backend"
  port        = var.backend_port
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    matcher             = "200"
  }

  tags = local.common_tags
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  tags = local.common_tags
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = local.common_tags
}

# =============================================================================
# ECS Cluster & Service
# =============================================================================

resource "aws_ecs_cluster" "main" {
  name = local.name_prefix

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = local.common_tags
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.name_prefix}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${var.ecr_repository_url}:${var.image_tag}"
      cpu       = var.backend_cpu
      memory    = var.backend_memory
      essential = true

      portMappings = [
        {
          containerPort = var.backend_port
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = tostring(var.backend_port)
        }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_secretsmanager_secret.database.arn
        },
        {
          name      = "REDIS_URL"
          valueFrom = aws_secretsmanager_secret.redis.arn
        },
        {
          name      = "JWT_SECRET"
          valueFrom = aws_secretsmanager_secret.jwt.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
          "awslogs-create-group"  = "true"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.backend_port}/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = local.common_tags
}

resource "aws_ecs_service" "backend" {
  name            = "${local.name_prefix}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.backend_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = var.backend_port
  }

  enable_execute_command = var.environment != "prod"

  # Auto-scaling
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 100
    base              = var.backend_desired_count
  }

  tags = local.common_tags
}

resource "aws_appautoscaling_target" "backend" {
  max_capacity       = var.backend_max_capacity
  min_capacity       = var.backend_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "backend_cpu" {
  name               = "${local.name_prefix}-backend-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# =============================================================================
# RDS PostgreSQL
# =============================================================================

resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = module.vpc.database_subnets

  tags = local.common_tags
}

resource "aws_db_parameter_group" "main" {
  name   = "${local.name_prefix}-db-params"
  family = "postgres15"

  parameter {
    name  = "max_connections"
    value = "100"
  }

  parameter {
    name  = "shared_buffers"
    value = "256MB"
  }

  parameter {
    name  = "effective_cache_size"
    value = "1GB"
  }
}

resource "aws_db_instance" "main" {
  identifier = "${local.name_prefix}-db"

  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_storage
  max_allocated_storage = var.db_max_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id           = var.kms_key_arn

  db_name  = "aerosense"
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]
  parameter_group_name   = aws_db_parameter_group.main.name

  multi_az               = var.environment == "prod"
  backup_retention_period = var.db_backup_retention
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"

  performance_insights_enabled = var.environment == "prod"

  deletion_protection = var.environment == "prod"

  skip_final_snapshot = var.environment != "prod"
  final_snapshot_identifier = var.environment != "prod" ? null : "${local.name_prefix}-final-snapshot"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = local.common_tags
}

resource "aws_security_group" "database" {
  name_prefix = "${local.name_prefix}-db-"
  description = "Security group for RDS"
  vpc_id      = module.vpc.vpc_id

  tags = local.common_tags
}

resource "aws_security_group_rule" "ecs_to_db" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.database.id
  source_security_group_id = aws_security_group.ecs_tasks.id
}

# =============================================================================
# ElastiCache Redis
# =============================================================================

resource "aws_elasticache_subnet_group" "main" {
  name        = "${local.name_prefix}-cache-subnet"
  subnet_ids = module.vpc.elasticache_subnets
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id          = "${local.name_prefix}-redis"
  replication_group_description = "AeroSense Redis cache"
  node_type                     = var.redis_node_type
  number_cache_clusters         = var.environment == "prod" ? 3 : 1
  port                          = 6379

  automatic_failover_enabled = var.environment == "prod"
  multi_az_enabled           = var.environment == "prod"

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = var.redis_auth_token

  snapshot_retention_limit = var.environment == "prod" ? 7 : 1
  snapshot_window         = "03:00-05:00"

  tags = local.common_tags
}

resource "aws_security_group" "redis" {
  name_prefix = "${local.name_prefix}-redis-"
  description = "Security group for ElastiCache"
  vpc_id      = module.vpc.vpc_id

  tags = local.common_tags
}

resource "aws_security_group_rule" "ecs_to_redis" {
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  security_group_id        = aws_security_group.redis.id
  source_security_group_id = aws_security_group.ecs_tasks.id
}

# =============================================================================
# SQS for Notifications
# =============================================================================

resource "aws_sqs_queue" "notifications" {
  name = "${local.name_prefix}-notifications"

  visibility_timeout_seconds = 300
  message_retention_seconds  = 86400 # 24 hours
  max_message_size           = 262144 # 256 KB

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notifications_dlq.arn
    maxReceiveCount     = 3
  })

  sqs_managed_sse_enabled = true

  tags = local.common_tags
}

resource "aws_sqs_queue" "notifications_dlq" {
  name = "${local.name_prefix}-notifications-dlq"

  message_retention_seconds = 1209600 # 14 days

  sqs_managed_sse_enabled = true

  tags = local.common_tags
}

# =============================================================================
# S3 Buckets
# =============================================================================

resource "aws_s3_bucket" "logs" {
  bucket = "${local.name_prefix}-logs-${random_id.logs_suffix.hex}"

  tags = local.common_tags
}

resource "random_id" "logs_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "delete-old-logs"
    status = "enabled"

    expiration {
      days = 30
    }

    noncurrent_version_expiration {
      noncurrent_days = 1
    }
  }
}

# =============================================================================
# Secrets Manager
# =============================================================================

resource "aws_secretsmanager_secret" "database" {
  name = "${local.name_prefix}/database"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "database" {
  secret_id     = aws_secretsmanager_secret.database.id
  secret_string = jsonencode({
    host     = aws_db_instance.main.endpoint
    port     = 5432
    database = "aerosense"
    username = var.db_username
    password = var.db_password
  })
}

resource "aws_secretsmanager_secret" "redis" {
  name = "${local.name_prefix}/redis"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "redis" {
  secret_id     = aws_secretsmanager_secret.redis.id
  secret_string = jsonencode({
    host     = aws_elasticache_replication_group.main.primary_endpoint_address
    port     = 6379
    password = var.redis_auth_token
  })
}

resource "aws_secretsmanager_secret" "jwt" {
  name = "${local.name_prefix}/jwt"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id     = aws_secretsmanager_secret.jwt.id
  secret_string = jsonencode({
    secret = var.jwt_secret
  })
}

# =============================================================================
# CloudWatch
# =============================================================================

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${local.name_prefix}/backend"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = local.common_tags
}

resource "aws_cloudwatch_dashboard" "main" {
  name = local.name_prefix

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "log"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          logGroupName = aws_cloudwatch_log_group.backend.name
          title        = "Backend Logs"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            {
              label   = "CPU Utilization"
              id      = "m1"
              returnData = false
              stat    = "Average"
              period  = 300
              region  = var.aws_region
              namespace = "AWS/ECS"
              dimensions = [
                {
                  name  = "ServiceName"
                  value = aws_ecs_service.backend.name
                }
              ]
              metricName = "CPUUtilization"
            }
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ECS CPU"
        }
      }
    ]
  })

  tags = local.common_tags
}

# =============================================================================
# Route 53 (Optional - for custom domain)
# =============================================================================

resource "aws_route53_zone" "main" {
  count = var.create_dns_zone ? 1 : 0

  name = var.domain_name
}

# =============================================================================
# Variables
# =============================================================================

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "aerosense"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "backend_port" {
  description = "Port for backend API"
  type        = number
  default     = 3000
}

variable "backend_cpu" {
  description = "CPU units for backend ECS tasks"
  type        = number
  default     = 256
}

variable "backend_memory" {
  description = "Memory for backend ECS tasks (MB)"
  type        = number
  default     = 512
}

variable "backend_desired_count" {
  description = "Desired count of backend tasks"
  type        = number
  default     = 2
}

variable "backend_min_capacity" {
  description = "Minimum capacity for auto-scaling"
  type        = number
  default     = 2
}

variable "backend_max_capacity" {
  description = "Maximum capacity for auto-scaling"
  type        = number
  default     = 10
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_storage" {
  description = "Initial database storage (GB)"
  type        = number
  default     = 20
}

variable "db_max_storage" {
  description = "Maximum database storage (GB)"
  type        = number
  default     = 100
}

variable "db_username" {
  description = "Database username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_backup_retention" {
  description = "Backup retention period (days)"
  type        = number
  default     = 7
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_auth_token" {
  description = "Redis auth token"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT secret key"
  type        = string
  sensitive   = true
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS"
  type        = string
  default     = ""
}

variable "ecr_repository_url" {
  description = "ECR repository URL for Docker images"
  type        = string
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

variable "domain_name" {
  description = "Custom domain name (optional)"
  type        = string
  default     = ""
}

variable "create_dns_zone" {
  description = "Create Route 53 hosted zone"
  type        = bool
  default     = false
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption"
  type        = string
  default     = ""
}

# =============================================================================
# Outputs
# =============================================================================

output "api_endpoint" {
  description = "API endpoint URL"
  value       = aws_lb.main.dns_name
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.backend.name
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive    = true
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive    = true
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnets
}
