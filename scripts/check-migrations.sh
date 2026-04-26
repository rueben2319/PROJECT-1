#!/bin/bash

# MSCE Learn Migration Status Checker
# Verifies all database migrations are applied and up to date

set -e

# Configuration
SUPABASE_URL="${SUPABASE_URL:-https://ufdtyxdbznsaytpgnsmt.supabase.co}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if required environment variables are set
check_prerequisites() {
    log "Checking prerequisites..."
    
    if [ -z "$SUPABASE_URL" ]; then
        error "SUPABASE_URL environment variable not set"
        echo "Please set: export SUPABASE_URL=your_supabase_url"
        exit 1
    fi
    
    if [ -z "$SUPABASE_SERVICE_KEY" ]; then
        error "SUPABASE_SERVICE_KEY environment variable not set"
        echo "Please set: export SUPABASE_SERVICE_KEY=your_service_role_key"
        exit 1
    fi
    
    if ! command -v psql &> /dev/null; then
        error "psql is not installed"
        echo "Please install PostgreSQL client: sudo apt install postgresql-client"
        exit 1
    fi
    
    success "Prerequisites checked"
}

# Check if schema_migrations table exists
check_schema_migrations_table() {
    log "Checking schema_migrations table..."
    
    local result=$(psql "$SUPABASE_URL" -t -c "
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'schema_migrations'
        );
    " 2>/dev/null | tr -d ' ')
    
    if [ "$result" = "t" ]; then
        success "schema_migrations table exists"
        return 0
    else
        warning "schema_migrations table not found"
        return 1
    fi
}

# Create schema_migrations table if it doesn't exist
create_schema_migrations_table() {
    log "Creating schema_migrations table..."
    
    psql "$SUPABASE_URL" -c "
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        COMMENT ON TABLE schema_migrations IS 'Tracks applied database migrations';
    " 2>/dev/null
    
    success "schema_migrations table created"
}

# Get list of migration files
get_migration_files() {
    local migrations_dir="./supabase/migrations"
    local migration_files=()
    
    if [ -d "$migrations_dir" ]; then
        while IFS= read -r -d '' file; do
            migration_files+=("$(basename "$file")")
        done < <(find "$migrations_dir" -name "*.sql" -print0 | sort -z)
    fi
    
    echo "${migration_files[@]}"
}

# Check migration status
check_migration_status() {
    log "Checking migration status..."
    
    local migration_files=($(get_migration_files))
    local applied_migrations=()
    local pending_migrations=()
    local total_files=${#migration_files[@]}
    local applied_count=0
    local pending_count=0
    
    # Get applied migrations from database
    if check_schema_migrations_table; then
        local db_migrations=$(psql "$SUPABASE_URL" -t -c "
            SELECT version FROM schema_migrations ORDER BY version;
        " 2>/dev/null | tr -d ' ')
        
        # Convert to array
        applied_migrations=($db_migrations)
        applied_count=${#applied_migrations[@]}
    fi
    
    # Check each migration file
    for migration_file in "${migration_files[@]}"; do
        if [[ " ${applied_migrations[*]} " =~ " ${migration_file} " ]]; then
            applied_count=$((applied_count + 1))
        else
            pending_migrations+=("$migration_file")
            pending_count=$((pending_count + 1))
        fi
    done
    
    # Display results
    echo ""
    echo "📊 Migration Status Summary:"
    echo "=========================="
    echo "Total migration files: $total_files"
    echo "Applied migrations: $applied_count"
    echo "Pending migrations: $pending_count"
    echo ""
    
    if [ $pending_count -eq 0 ]; then
        success "All migrations are up to date!"
        return 0
    else
        warning "There are $pending_count pending migrations:"
        for migration in "${pending_migrations[@]}"; do
            echo "  - $migration"
        done
        echo ""
        return 1
    fi
}

# Apply pending migrations
apply_pending_migrations() {
    log "Applying pending migrations..."
    
    local migration_files=($(get_migration_files))
    local applied_migrations=()
    
    # Get applied migrations from database
    if check_schema_migrations_table; then
        local db_migrations=$(psql "$SUPABASE_URL" -t -c "
            SELECT version FROM schema_migrations ORDER BY version;
        " 2>/dev/null | tr -d ' ')
        applied_migrations=($db_migrations)
    fi
    
    # Apply each pending migration
    for migration_file in "${migration_files[@]}"; do
        if [[ ! " ${applied_migrations[*]} " =~ " ${migration_file} " ]]; then
            echo "Applying: $migration_file"
            
            local migration_path="./supabase/migrations/$migration_file"
            
            if [ -f "$migration_path" ]; then
                # Apply migration
                if psql "$SUPABASE_URL" -f "$migration_path" 2>/dev/null; then
                    # Record migration
                    psql "$SUPABASE_URL" -c "
                        INSERT INTO schema_migrations (version) 
                        VALUES ('$migration_file')
                        ON CONFLICT (version) DO NOTHING;
                    " 2>/dev/null
                    
                    success "✓ $migration_file applied"
                else
                    error "✗ Failed to apply $migration_file"
                    return 1
                fi
            else
                error "Migration file not found: $migration_path"
                return 1
            fi
        fi
    done
    
    success "All pending migrations applied successfully"
}

# Verify database schema
verify_database_schema() {
    log "Verifying database schema..."
    
    local tables=(
        "profiles"
        "courses"
        "videos"
        "enrollments"
        "payments"
        "progress"
        "audit_log"
        "feature_flags"
        "rate_limits"
        "analytics_summary"
    )
    
    local views=(
        "weekly_revenue"
        "student_engagement"
        "course_performance"
        "video_performance"
        "payment_analytics"
        "active_enrollments"
        "course_stats"
    )
    
    local missing_tables=()
    local missing_views=()
    
    # Check tables
    for table in "${tables[@]}"; do
        local exists=$(psql "$SUPABASE_URL" -t -c "
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = '$table'
            );
        " 2>/dev/null | tr -d ' ')
        
        if [ "$exists" != "t" ]; then
            missing_tables+=("$table")
        fi
    done
    
    # Check views
    for view in "${views[@]}"; do
        local exists=$(psql "$SUPABASE_URL" -t -c "
            SELECT EXISTS (
                SELECT FROM information_schema.views 
                WHERE table_schema = 'public' 
                AND table_name = '$view'
            );
        " 2>/dev/null | tr -d ' ')
        
        if [ "$exists" != "t" ]; then
            missing_views+=("$view")
        fi
    done
    
    # Display results
    echo ""
    echo "🗄️ Database Schema Verification:"
    echo "==============================="
    
    if [ ${#missing_tables[@]} -eq 0 ]; then
        success "All required tables exist"
    else
        error "Missing tables:"
        for table in "${missing_tables[@]}"; do
            echo "  - $table"
        done
    fi
    
    if [ ${#missing_views[@]} -eq 0 ]; then
        success "All required views exist"
    else
        warning "Missing views:"
        for view in "${missing_views[@]}"; do
            echo "  - $view"
        done
    fi
    
    return ${#missing_tables[@]}
}

# Check RLS policies
check_rls_policies() {
    log "Checking Row Level Security policies..."
    
    local tables_with_rls=(
        "profiles"
        "courses"
        "videos"
        "enrollments"
        "payments"
        "progress"
        "audit_log"
        "feature_flags"
        "rate_limits"
        "analytics_summary"
    )
    
    local tables_without_rls=()
    
    for table in "${tables_with_rls[@]}"; do
        local rls_enabled=$(psql "$SUPABASE_URL" -t -c "
            SELECT rowlevelsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = '$table';
        " 2>/dev/null | tr -d ' ')
        
        if [ "$rls_enabled" != "t" ]; then
            tables_without_rls+=("$table")
        fi
    done
    
    echo ""
    echo "🔒 RLS Policy Status:"
    echo "===================="
    
    if [ ${#tables_without_rls[@]} -eq 0 ]; then
        success "RLS enabled on all required tables"
    else
        warning "Tables without RLS:"
        for table in "${tables_without_rls[@]}"; do
            echo "  - $table"
        done
    fi
    
    return ${#tables_without_rls[@]}
}

# Check indexes
check_indexes() {
    log "Checking database indexes..."
    
    local critical_indexes=(
        "idx_courses_subject"
        "idx_courses_published"
        "idx_videos_course_published"
        "idx_enrollments_user_status"
        "idx_payments_status"
        "idx_progress_user_completed"
        "idx_audit_log_created_at"
        "idx_rate_limits_expires_at"
    )
    
    local missing_indexes=()
    
    for index in "${critical_indexes[@]}"; do
        local exists=$(psql "$SUPABASE_URL" -t -c "
            SELECT EXISTS (
                SELECT FROM pg_indexes 
                WHERE schemaname = 'public' 
                AND indexname = '$index'
            );
        " 2>/dev/null | tr -d ' ')
        
        if [ "$exists" != "t" ]; then
            missing_indexes+=("$index")
        fi
    done
    
    echo ""
    echo "📊 Index Status:"
    echo "==============="
    
    if [ ${#missing_indexes[@]} -eq 0 ]; then
        success "All critical indexes exist"
    else
        warning "Missing critical indexes:"
        for index in "${missing_indexes[@]}"; do
            echo "  - $index"
        done
    fi
    
    return ${#missing_indexes[@]}
}

# Check cron jobs
check_cron_jobs() {
    log "Checking scheduled jobs..."
    
    local expected_jobs=(
        "expire-pending-payments"
        "clean-rate-limits"
        "update-enrollment-statuses"
        "cleanup-audit-logs"
        "update-analytics-summary"
    )
    
    local missing_jobs=()
    
    for job in "${expected_jobs[@]}"; do
        local exists=$(psql "$SUPABASE_URL" -t -c "
            SELECT EXISTS (
                SELECT FROM cron.job 
                WHERE schedule = '$job'
            );
        " 2>/dev/null | tr -d ' ')
        
        if [ "$exists" != "t" ]; then
            missing_jobs+=("$job")
        fi
    done
    
    echo ""
    echo "⏰ Scheduled Jobs Status:"
    echo "========================="
    
    if [ ${#missing_jobs[@]} -eq 0 ]; then
        success "All scheduled jobs are configured"
    else
        warning "Missing scheduled jobs:"
        for job in "${missing_jobs[@]}"; do
            echo "  - $job"
        done
    fi
    
    return ${#missing_jobs[@]}
}

# Show usage
show_usage() {
    echo "MSCE Learn Migration Status Checker"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -c, --check             Check migration status only"
    echo "  -a, --apply             Apply pending migrations"
    echo "  -v, --verify            Verify database schema"
    echo "  -f, --full              Run full check (default)"
    echo ""
    echo "Environment Variables:"
    echo "  SUPABASE_URL            Supabase project URL"
    echo "  SUPABASE_SERVICE_KEY    Supabase service role key"
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  $0 --check"
    echo "  $0 --apply"
    echo "  $0 --verify"
    echo ""
    echo "Requirements:"
    echo "  - PostgreSQL client (psql)"
    echo "  - Supabase service role key"
}

# Main execution
main() {
    local action="full"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -c|--check)
                action="check"
                shift
                ;;
            -a|--apply)
                action="apply"
                shift
                ;;
            -v|--verify)
                action="verify"
                shift
                ;;
            -f|--full)
                action="full"
                shift
                ;;
            *)
                error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    echo "🚀 MSCE Learn Migration Status Checker"
    echo "====================================="
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Ensure schema_migrations table exists
    if ! check_schema_migrations_table; then
        create_schema_migrations_table
    fi
    
    # Execute based on action
    case $action in
        "check")
            check_migration_status
            ;;
        "apply")
            if check_migration_status; then
                echo "No pending migrations to apply"
            else
                apply_pending_migrations
            fi
            ;;
        "verify")
            verify_database_schema
            check_rls_policies
            check_indexes
            check_cron_jobs
            ;;
        "full")
            echo "🔍 Running full migration check..."
            echo ""
            
            # Check migration status
            if ! check_migration_status; then
                echo ""
                read -p "Do you want to apply pending migrations? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    apply_pending_migrations
                else
                    warning "Skipping migration application"
                fi
            fi
            
            echo ""
            # Verify schema
            verify_database_schema
            check_rls_policies
            check_indexes
            check_cron_jobs
            
            echo ""
            success "Full migration check completed"
            ;;
    esac
}

# Run main function
main
