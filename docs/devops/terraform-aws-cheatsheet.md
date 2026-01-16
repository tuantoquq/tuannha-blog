---
outline: deep
description: A comprehensive Terraform cheatsheet for AWS, covering essential CLI commands, state management, provider configuration, and best practices.
---

# Terraform Cheatsheet for AWS

Terraform is the industry standard for Infrastructure as Code (IaC). This cheatsheet provides a quick reference for essential commands, state management, and common AWS resource patterns.

## 1. Essential CLI Commands

### Workflow

```bash
# Initialize working directory (do this first!)
terraform init

# Check formatting
terraform fmt -recursive

# Validate configuration syntax
terraform validate

# Plan changes (dry run)
terraform plan -out=tfplan

# Apply changes
terraform apply tfplan
# OR auto-approve (use with caution)
terraform apply -auto-approve

# Destroy infrastructure
terraform destroy
```

### State Management

Managing state is critical for teamwork and consistency.

```bash
# List all resources in state
terraform state list

# Show details of a specific resource
terraform state show aws_s3_bucket.my_bucket

# Move a resource (rename in state without destroying)
terraform state mv aws_instance.old aws_instance.new

# Remove a resource from state (stop tracking it)
terraform state rm aws_instance.legacy

# Import existing AWS resource into state
terraform import aws_s3_bucket.existing_bucket my-bucket-name
```

### Debugging

```bash
# Enable verbose logging (TRACE, DEBUG, INFO, WARN, ERROR)
export TF_LOG=DEBUG

# Output logs to file
export TF_LOG_PATH=./terraform.log
```

---

## 2. AWS Provider Configuration

Configure the AWS provider with best practices for multi-region or multi-profile setups.

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.5.0"
}

provider "aws" {
  region  = "us-east-1"
  profile = "my-profile" # ~/.aws/credentials profile

  default_tags {
    tags = {
      Environment = "Production"
      ManagedBy   = "Terraform"
    }
  }
}

# Alias for secondary region (e.g., for ACM in us-east-1)
provider "aws" {
  alias  = "us-east-1"
  region = "us-east-1"
}
```

---

## 3. Core AWS Resources

### VPC & Networking

```hcl
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "main-vpc"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "us-west-2a"
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id
}
```

### Security Group

::: tip Best Practice
Always use `name_prefix` instead of `name` to allow Terraform to replace the resource with zero downtime (create before destroy).
:::

```hcl
resource "aws_security_group" "web" {
  name_prefix = "web-sg-"
  vpc_id      = aws_vpc.main.id

  # Inbound HTTP
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound All
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

### EC2 Instance

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0" # Amazon Linux 2
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public.id

  vpc_security_group_ids = [aws_security_group.web.id]

  user_data = <<-EOF
              #!/bin/bash
              echo "Hello, World" > index.html
              python3 -m http.server 80 &
              EOF

  tags = {
    Name = "web-server"
  }
}
```

### S3 Bucket (Private)

```hcl
resource "aws_s3_bucket" "data" {
  bucket = "my-unique-bucket-name-123"
}

# Block all public access (Safety First!)
resource "aws_s3_bucket_public_access_block" "data" {
  bucket = aws_s3_bucket.data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable versioning
resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id
  versioning_configuration {
    status = "Enabled"
  }
}
```

---

## 4. Variables & Outputs

### Input Variables (`variables.tf`)

```hcl
variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "instance_count" {
  type    = number
  default = 1
}
```

### Outputs (`outputs.tf`)

```hcl
output "web_url" {
  description = "Public URL of the web server"
  value       = "http://${aws_instance.web.public_ip}"
}
```

---

## 5. Best Practices Checklist

::: warning Production Readiness
Before deploying to production, ensure you check these items.
:::

- [ ] **Remote State:** Use S3 backend with DynamoDB locking. Never commit `terraform.tfstate` to git.
- [ ] **Versioning:** Pin provider and Terraform versions.
- [ ] **Structure:** Separate `main.tf`, `variables.tf`, and `outputs.tf`.
- [ ] **Secrets:** Never hardcode secrets. Use AWS Secrets Manager or environment variables (`TF_VAR_db_password`).
- [ ] **Formatting:** Always run `terraform fmt`.
- [ ] **Modules:** Use modules for reusable components (e.g., standard VPC setup).
- [ ] **Taint:** Don't manually modifying resources in AWS console; Terraform will blindly revert them.

### Remote Backend Example

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state-bucket"
    key            = "prod/app.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```
