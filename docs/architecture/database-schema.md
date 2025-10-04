# ShopXperience Database Schema Design

## Overview
This document outlines the PostgreSQL database schema for ShopXperience, a multi-tenant point-of-sale system. The schema ensures tenant isolation by including a `tenant_id` foreign key in all tenant-specific tables. Normalization is applied to 3NF to reduce redundancy. Indexes are added on foreign keys and frequently queried fields for performance. The design supports scalability through proper partitioning and indexing strategies.

## Key Entities and Relationships
- **Tenants**: Core entity for multi-tenancy.
- **Users**: Associated with tenants, with roles.
- **Locations**: Store locations per tenant.
- **Products**: Items sold, per tenant.
- **Inventory**: Stock levels per product and location.
- **Suppliers**: Supplier profiles for procurement.
- **Batches**: Lot tracking for products with expiration dates.
- **Transfers**: Inventory transfers between locations.
- **Customers**: Buyer information per tenant.
- **Transactions**: Sales records linking customers, products, and locations.
- **Reports**: Configurations for analytics reports.

## Entity-Relationship Diagram (Mermaid)
```mermaid
erDiagram
    TENANTS ||--o{ USERS : "has"
    TENANTS ||--o{ LOCATIONS : "owns"
    TENANTS ||--o{ PRODUCTS : "offers"
    TENANTS ||--o{ CUSTOMERS : "serves"
    TENANTS ||--o{ SUPPLIERS : "has"
    TENANTS ||--o{ REPORTS : "generates"
    LOCATIONS ||--o{ INVENTORY : "holds"
    PRODUCTS ||--o{ INVENTORY : "tracked in"
    PRODUCTS ||--o{ BATCHES : "batched in"
    PRODUCTS ||--o{ TRANSACTION_ITEMS : "sold in"
    SUPPLIERS ||--o{ BATCHES : "supplies"
    LOCATIONS ||--o{ TRANSFERS : "from"
    LOCATIONS ||--o{ TRANSFERS : "to"
    PRODUCTS ||--o{ TRANSFERS : "transferred"
    BATCHES ||--o{ TRANSFERS : "transferred"
    CUSTOMERS ||--o{ TRANSACTIONS : "makes"
    LOCATIONS ||--o{ TRANSACTIONS : "occurs at"
    TRANSACTIONS ||--o{ TRANSACTION_ITEMS : "contains"
```

## Table Structures

### 1. tenants
Stores information about each tenant (shop).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique tenant identifier |
| name | VARCHAR(255) | NOT NULL | Tenant name |
| domain | VARCHAR(255) | UNIQUE, NOT NULL | Unique domain for tenant |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes**: PRIMARY KEY on id, UNIQUE on domain.

### 2. users
Users within tenants, with roles for access control.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique user identifier |
| tenant_id | INTEGER | NOT NULL, FOREIGN KEY REFERENCES tenants(id) | Tenant association |
| username | VARCHAR(255) | UNIQUE (tenant_id, username), NOT NULL | Username within tenant |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email |
| password_hash | VARCHAR(255) | NOT NULL | Hashed password |
| role | VARCHAR(50) | NOT NULL, CHECK (role IN ('admin', 'manager', 'cashier')) | User role |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes**: PRIMARY KEY on id, FOREIGN KEY on tenant_id, UNIQUE on (tenant_id, username), INDEX on email.

### 3. locations
Store locations for each tenant.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique location identifier |
| tenant_id | INTEGER | NOT NULL, FOREIGN KEY REFERENCES tenants(id) | Tenant association |
| name | VARCHAR(255) | NOT NULL | Location name |
| address | TEXT | NOT NULL | Full address |
| phone | VARCHAR(20) | | Contact phone |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes**: PRIMARY KEY on id, FOREIGN KEY on tenant_id, INDEX on tenant_id.

### 4. products
Products offered by tenants.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique product identifier |
| tenant_id | INTEGER | NOT NULL, FOREIGN KEY REFERENCES tenants(id) | Tenant association |
| name | VARCHAR(255) | NOT NULL | Product name |
| description | TEXT | | Product description |
| sku | VARCHAR(100) | UNIQUE (tenant_id, sku), NOT NULL | Stock keeping unit |
| price | DECIMAL(10,2) | NOT NULL | Selling price |
| cost | DECIMAL(10,2) | | Cost price |
| category | VARCHAR(100) | | Product category |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes**: PRIMARY KEY on id, FOREIGN KEY on tenant_id, UNIQUE on (tenant_id, sku), INDEX on category.

### 5. inventory
Stock levels for products at specific locations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique inventory record |
| tenant_id | INTEGER | NOT NULL, FOREIGN KEY REFERENCES tenants(id) | Tenant association |
| product_id | INTEGER | NOT NULL, FOREIGN KEY REFERENCES products(id) | Product reference |
| location_id | INTEGER | NOT NULL, FOREIGN KEY REFERENCES locations(id) | Location reference |
| quantity | INTEGER | NOT NULL, DEFAULT 0 | Current stock quantity |
| min_stock | INTEGER | DEFAULT 0 | Minimum stock threshold |
| reorder_point | INTEGER | DEFAULT 0 | Reorder point threshold |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes**: PRIMARY KEY on id, FOREIGN KEY on tenant_id, product_id, location_id, UNIQUE on (product_id, location_id), INDEX on quantity.

### 6. customers
Customer information per tenant.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique customer identifier |
| tenant_id | INTEGER | NOT NULL, FOREIGN KEY REFERENCES tenants(id) | Tenant association |
| first_name | VARCHAR(100) | NOT NULL | First name |
| last_name | VARCHAR(100) | NOT NULL | Last name |
| email | VARCHAR(255) | UNIQUE (tenant_id, email) | Email address |
| phone | VARCHAR(20) | | Phone number |
| address | TEXT | | Address |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes**: PRIMARY KEY on id, FOREIGN KEY on tenant_id, UNIQUE on (tenant_id, email), INDEX on phone.

### 7. transactions
Sales transactions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique transaction identifier |
| tenant_id | INTEGER | NOT NULL, FOREIGN KEY REFERENCES tenants(id) | Tenant association |
| customer_id | INTEGER | FOREIGN KEY REFERENCES customers(id) | Customer reference (nullable for anonymous) |
| location_id | INTEGER | NOT NULL, FOREIGN KEY REFERENCES locations(id) | Location of transaction |
| total_amount | DECIMAL(10,2) | NOT NULL | Total transaction amount |
| tax_amount | DECIMAL(10,2) | DEFAULT 0 | Tax amount |
| discount_amount | DECIMAL(10,2) | DEFAULT 0 | Discount amount |
| payment_method | VARCHAR(50) | NOT NULL | Payment method (cash, card, etc.) |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'completed' | Transaction status |
| created_at | TIMESTAMP | DEFAULT NOW() | Transaction timestamp |

**Indexes**: PRIMARY KEY on id, FOREIGN KEY on tenant_id, customer_id, location_id, INDEX on created_at, status.

### 8. transaction_items
Line items for transactions (junction table for many-to-many between transactions and products).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique item identifier |
| transaction_id | INTEGER | NOT NULL, FOREIGN KEY REFERENCES transactions(id) | Transaction reference |
| product_id | INTEGER | NOT NULL, FOREIGN KEY REFERENCES products(id) | Product reference |
| quantity | INTEGER | NOT NULL | Quantity sold |
| unit_price | DECIMAL(10,2) | NOT NULL | Price per unit at time of sale |
| total_price | DECIMAL(10,2) | NOT NULL | Total for this item |

**Indexes**: PRIMARY KEY on id, FOREIGN KEY on transaction_id, product_id.

### 9. reports
Report configurations or generated reports for analytics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique report identifier |
| tenant_id | INTEGER | NOT NULL, FOREIGN KEY REFERENCES tenants(id) | Tenant association |
| name | VARCHAR(255) | NOT NULL | Report name |
| type | VARCHAR(50) | NOT NULL | Report type (sales, inventory, etc.) |
| parameters | JSONB | | Report parameters |
| created_by | INTEGER | FOREIGN KEY REFERENCES users(id) | User who created |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Indexes**: PRIMARY KEY on id, FOREIGN KEY on tenant_id, INDEX on type.

### 10. suppliers
Supplier profiles for procurement.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique supplier identifier |
| tenant_id | INTEGER | NOT NULL, FOREIGN KEY REFERENCES tenants(id) | Tenant association |
| name | VARCHAR(255) | NOT NULL | Supplier name |
| contact_name | VARCHAR(255) | | Contact person name |
| email | VARCHAR(255) | | Contact email |
| phone | VARCHAR(20) | | Contact phone |
| address | TEXT | | Supplier address |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes**: PRIMARY KEY on id, FOREIGN KEY on tenant_id, UNIQUE on (tenant_id, name).

### 11. batches
Lot tracking for products with expiration dates.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique batch identifier |
| tenant_id | INTEGER | NOT NULL, FOREIGN KEY REFERENCES tenants(id) | Tenant association |
| product_id | INTEGER | NOT NULL, FOREIGN KEY REFERENCES products(id) | Product reference |
| supplier_id | INTEGER | FOREIGN KEY REFERENCES suppliers(id) | Supplier reference |
| batch_number | VARCHAR(100) | NOT NULL | Batch/lot number |
| quantity_received | INTEGER | NOT NULL | Quantity received in this batch |
| cost_per_unit | DECIMAL(10,2) | NOT NULL | Cost per unit for this batch |
| expiration_date | DATE | | Expiration date |
| received_date | DATE | DEFAULT NOW() | Date batch was received |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes**: PRIMARY KEY on id, FOREIGN KEY on tenant_id, product_id, supplier_id, UNIQUE on (tenant_id, product_id, batch_number).

### 12. transfers
Inventory transfers between locations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique transfer identifier |
| tenant_id | INTEGER | NOT NULL, FOREIGN KEY REFERENCES tenants(id) | Tenant association |
| from_location_id | INTEGER | NOT NULL, FOREIGN KEY REFERENCES locations(id) | Source location |
| to_location_id | INTEGER | NOT NULL, FOREIGN KEY REFERENCES locations(id) | Destination location |
| product_id | INTEGER | NOT NULL, FOREIGN KEY REFERENCES products(id) | Product being transferred |
| batch_id | INTEGER | FOREIGN KEY REFERENCES batches(id) | Batch being transferred |
| quantity | INTEGER | NOT NULL | Quantity transferred |
| transfer_date | DATE | DEFAULT NOW() | Date of transfer |
| status | ENUM('pending', 'completed', 'cancelled') | DEFAULT 'pending' | Transfer status |
| notes | TEXT | | Additional notes |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes**: PRIMARY KEY on id, FOREIGN KEY on tenant_id, from_location_id, to_location_id, product_id, batch_id, INDEX on (tenant_id, status).

## Normalization and Relationships
- All tables are in 3NF: No transitive dependencies, all non-key attributes depend only on the primary key.
- Multi-tenant isolation: tenant_id ensures data separation.
- Foreign keys enforce referential integrity.
- Junction table (transaction_items) handles many-to-many between transactions and products.

## Performance and Scalability
- Indexes on all foreign keys and commonly queried fields (e.g., timestamps, status).
- Partitioning can be applied to large tables like transactions and transaction_items by tenant_id or date.
- Use PostgreSQL features like partial indexes for active records.

## Database Migration Strategy

### Migration Scripts
Database schema changes are managed through migration scripts that ensure:
- **Version Control**: All schema changes are tracked in version control
- **Rollback Capability**: Ability to revert changes if needed
- **Environment Consistency**: Same schema across development, staging, and production

### Migration Process
1. **Development**: Create migration scripts for schema changes
2. **Testing**: Test migrations on development and staging environments
3. **Deployment**: Apply migrations during deployment process
4. **Verification**: Validate data integrity after migration

## Backup and Recovery

### Backup Strategy
- **Automated Backups**: Daily RDS snapshots with 30-day retention
- **Transaction Log Backups**: Continuous backup of transaction logs
- **Cross-Region Backups**: Backup replication to secondary region
- **Application-Level Backups**: Export critical business data

### Recovery Procedures
- **Point-in-Time Recovery**: Restore to specific timestamp
- **Snapshot Recovery**: Restore from automated snapshots
- **Failover Recovery**: Automatic failover to standby replica
- **Data Export/Import**: For partial data recovery

## Query Optimization

### Common Query Patterns

#### Sales Analytics Query
```sql
SELECT
    DATE_TRUNC('month', t.created_at) as month,
    COUNT(t.id) as transactions,
    SUM(t.total_amount) as revenue,
    AVG(t.total_amount) as avg_transaction
FROM transactions t
WHERE t.tenant_id = $1
    AND t.created_at >= $2
    AND t.created_at <= $3
GROUP BY DATE_TRUNC('month', t.created_at)
ORDER BY month DESC;
```

#### Inventory Status Query
```sql
SELECT
    p.name,
    p.sku,
    i.quantity,
    i.min_stock,
    i.reorder_point,
    l.name as location_name
FROM inventory i
JOIN products p ON i.product_id = p.id
JOIN locations l ON i.location_id = l.id
WHERE i.tenant_id = $1
    AND i.quantity <= i.reorder_point
ORDER BY i.quantity ASC;
```

#### Customer Lifetime Value Query
```sql
SELECT
    c.first_name,
    c.last_name,
    c.email,
    COUNT(t.id) as total_transactions,
    SUM(t.total_amount) as lifetime_value,
    MAX(t.created_at) as last_transaction,
    AVG(t.total_amount) as avg_transaction
FROM customers c
LEFT JOIN transactions t ON c.id = t.customer_id
WHERE c.tenant_id = $1
GROUP BY c.id, c.first_name, c.last_name, c.email
ORDER BY lifetime_value DESC;
```

### Index Usage and Maintenance

#### Index Monitoring
```sql
-- Check index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Identify unused indexes
SELECT
    indexrelname,
    tablename,
    idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY tablename;
```

#### Index Maintenance
```sql
-- Reindex specific index
REINDEX INDEX CONCURRENTLY index_name;

-- Analyze table for query planner
ANALYZE table_name;

-- Vacuum table to reclaim space
VACUUM ANALYZE table_name;
```

## Data Integrity and Constraints

### Business Rules Enforcement

#### Check Constraints
```sql
-- Ensure positive prices
ALTER TABLE products
ADD CONSTRAINT positive_price
CHECK (price > 0);

-- Ensure valid quantities
ALTER TABLE inventory
ADD CONSTRAINT non_negative_quantity
CHECK (quantity >= 0);
```

#### Triggers for Data Integrity
```sql
-- Update inventory on transaction
CREATE OR REPLACE FUNCTION update_inventory_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE inventory
    SET quantity = quantity - NEW.quantity,
        updated_at = NOW()
    WHERE product_id = NEW.product_id
        AND location_id = (
            SELECT location_id FROM transactions
            WHERE id = NEW.transaction_id
        );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory
    AFTER INSERT ON transaction_items
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_on_transaction();
```

## Performance Monitoring

### Key Performance Metrics

#### Database Performance
- **Query Response Time**: Average time for query execution
- **Connection Pool Utilization**: Percentage of available connections used
- **Cache Hit Ratio**: Percentage of queries served from cache
- **Lock Wait Time**: Time spent waiting for locks

#### Monitoring Queries
```sql
-- Check active connections
SELECT
    datname,
    usename,
    client_addr,
    state,
    query_start,
    NOW() - query_start as duration
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY query_start;

-- Check table bloat
SELECT
    schemaname,
    tablename,
    n_dead_tup,
    n_live_tup,
    ROUND(n_dead_tup::float / (n_live_tup + n_dead_tup) * 100, 2) as bloat_ratio
FROM pg_stat_user_tables
ORDER BY bloat_ratio DESC;
```

## Security Considerations

### Row-Level Security (RLS)
```sql
-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create security policies
CREATE POLICY tenant_isolation ON users
    FOR ALL USING (tenant_id = current_setting('app.tenant_id')::integer);

CREATE POLICY tenant_isolation ON products
    FOR ALL USING (tenant_id = current_setting('app.tenant_id')::integer);
```

### Data Encryption
- **At Rest**: RDS encryption using AWS KMS
- **In Transit**: SSL/TLS encryption for all connections
- **Application Level**: Sensitive data encrypted before storage

### Audit Logging
```sql
-- Create audit table
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50),
    operation VARCHAR(10),
    old_values JSONB,
    new_values JSONB,
    user_id INTEGER,
    tenant_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (table_name, operation, old_values, new_values, user_id, tenant_id)
    VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW),
            current_setting('app.user_id', true)::integer,
            current_setting('app.tenant_id', true)::integer);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

## Additional Considerations
- Audit logging can be added via triggers on update/delete operations.
- Soft deletes can be implemented with a deleted_at column if needed.
- For high scalability, consider read replicas and sharding by tenant_id.
- Regular maintenance tasks include VACUUM, ANALYZE, and REINDEX operations.
- Monitor database growth and plan for partitioning of large tables.
- Implement proper backup testing and disaster recovery procedures.