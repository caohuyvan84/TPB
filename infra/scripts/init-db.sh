#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create databases for all 19 microservices
    CREATE DATABASE identity_db;
    CREATE DATABASE agent_db;
    CREATE DATABASE interaction_db;
    CREATE DATABASE ticket_db;
    CREATE DATABASE customer_db;
    CREATE DATABASE notification_db;
    CREATE DATABASE knowledge_db;
    CREATE DATABASE bfsi_core_db;
    CREATE DATABASE ai_db;
    CREATE DATABASE media_db;
    CREATE DATABASE audit_db;
    CREATE DATABASE object_schema_db;
    CREATE DATABASE layout_db;
    CREATE DATABASE workflow_db;
    CREATE DATABASE data_enrichment_db;
    CREATE DATABASE dashboard_db;
    CREATE DATABASE report_db;
    CREATE DATABASE cti_adapter_db;
    CREATE DATABASE api_gateway_db;

    -- Grant privileges
    GRANT ALL PRIVILEGES ON DATABASE identity_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE agent_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE interaction_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE ticket_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE customer_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE notification_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE knowledge_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE bfsi_core_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE ai_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE media_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE audit_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE object_schema_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE layout_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE workflow_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE data_enrichment_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE dashboard_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE report_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE cti_adapter_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE api_gateway_db TO postgres;
EOSQL

echo "All 19 databases created successfully"
