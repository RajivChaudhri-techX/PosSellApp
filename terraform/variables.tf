variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "shopxperience"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "shopuser"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}