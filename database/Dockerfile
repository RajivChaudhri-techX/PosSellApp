# Use official PostgreSQL image
FROM postgres:15-alpine

# Set environment variables for PostgreSQL
ENV POSTGRES_DB=shopxperience
ENV POSTGRES_USER=shopuser
ENV POSTGRES_PASSWORD=shoppass

# Expose PostgreSQL port
EXPOSE 5432

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD pg_isready -U $POSTGRES_USER -d $POSTGRES_DB || exit 1

# Default command (inherited from base image)