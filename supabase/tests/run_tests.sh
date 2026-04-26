#!/bin/bash

# MSCE Learn Test Runner
# Runs RLS policy tests and payment flow tests

set -e

echo "🚀 MSCE Learn Test Runner"
echo "======================"

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: Required environment variables not set"
    echo "Please set:"
    echo "  export SUPABASE_URL=your_supabase_url"
    echo "  export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
    echo "  export PAYCHANGU_SECRET_KEY=your_paychangu_secret_key"
    exit 1
fi

echo "✅ Environment variables found"

# Function to run SQL tests
run_sql_tests() {
    echo ""
    echo "📋 Running RLS Policy Tests..."
    echo "==============================="
    
    # Run the SQL test file
    psql "$SUPABASE_URL" -c "
    SET session_authorization TO 'anon';
    \i rls_policies.test.sql;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ RLS Policy Tests completed successfully"
    else
        echo "❌ RLS Policy Tests failed"
        exit 1
    fi
}

# Function to run TypeScript tests
run_ts_tests() {
    echo ""
    echo "📋 Running Payment Flow Tests..."
    echo "==============================="
    
    # Check if Deno is installed
    if ! command -v deno &> /dev/null; then
        echo "❌ Error: Deno is not installed"
        echo "Please install Deno: curl -fsSL https://deno.land/install.sh | sh"
        exit 1
    fi
    
    # Run TypeScript tests
    deno test --allow-net --allow-env payment_flow.test.ts
    
    if [ $? -eq 0 ]; then
        echo "✅ Payment Flow Tests completed successfully"
    else
        echo "❌ Payment Flow Tests failed"
        exit 1
    fi
}

# Function to run all tests
run_all_tests() {
    echo "🧪 Running all tests..."
    echo ""
    
    run_sql_tests
    run_ts_tests
    
    echo ""
    echo "🎉 All tests completed successfully!"
    echo ""
    echo "📊 Test Summary:"
    echo "  - RLS Policy Tests: ✅ Passed"
    echo "  - Payment Flow Tests: ✅ Passed"
    echo ""
    echo "🔒 Security verification complete"
}

# Function to setup test environment
setup_test_env() {
    echo "🔧 Setting up test environment..."
    
    # Create test databases if they don't exist
    psql "$SUPABASE_URL" -c "
    -- Create test users and data setup
    DO \$\$
    BEGIN
        -- Create test users if they don't exist
        INSERT INTO auth.users (id, email, created_at)
        VALUES 
            ('00000000-0000-0000-0000-000000000001', 'student-a@test.com', NOW()),
            ('00000000-0000-0000-0000-000000000002', 'student-b@test.com', NOW()),
            ('00000000-0000-0000-0000-000000000003', 'admin@test.com', NOW())
        ON CONFLICT (id) DO NOTHING;
        
        -- Create corresponding profiles
        INSERT INTO profiles (id, email, full_name, role, phone_number, created_at)
        VALUES 
            ('00000000-0000-0000-0000-000000000001', 'student-a@test.com', 'Student A', 'student', '0881234567', NOW()),
            ('00000000-0000-0000-0000-000000000002', 'student-b@test.com', 'Student B', 'student', '0991234567', NOW()),
            ('00000000-0000-0000-0000-000000000003', 'admin@test.com', 'Admin User', 'admin', '0889876543', NOW())
        ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
    END \$\$;
    "
    
    echo "✅ Test environment setup complete"
}

# Function to cleanup test environment
cleanup_test_env() {
    echo "🧹 Cleaning up test environment..."
    
    psql "$SUPABASE_URL" -c "
    -- Clean up test data
    DO \$\$
    BEGIN
        -- Remove test audit logs
        DELETE FROM audit_log WHERE user_id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');
        
        -- Remove test enrollments
        DELETE FROM enrollments WHERE user_id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
        
        -- Remove test payments
        DELETE FROM payments WHERE user_id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
        
        -- Remove test videos
        DELETE FROM videos WHERE id LIKE '00000000-0000-0000-0000-00000000002%';
        
        -- Remove test courses
        DELETE FROM courses WHERE id LIKE '00000000-0000-0000-0000-00000000001%';
        
        -- Remove test profiles
        DELETE FROM profiles WHERE id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');
        
        -- Remove test users
        DELETE FROM auth.users WHERE id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');
    END \$\$;
    "
    
    echo "✅ Test environment cleanup complete"
}

# Parse command line arguments
case "${1:-all}" in
    "sql")
        run_sql_tests
        ;;
    "ts")
        run_ts_tests
        ;;
    "all")
        run_all_tests
        ;;
    "setup")
        setup_test_env
        ;;
    "cleanup")
        cleanup_test_env
        ;;
    "help"|"-h"|"--help")
        echo "MSCE Learn Test Runner"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  all       Run all tests (default)"
        echo "  sql       Run RLS policy tests only"
        echo "  ts        Run payment flow tests only"
        echo "  setup     Setup test environment"
        echo "  cleanup   Clean up test environment"
        echo "  help      Show this help message"
        echo ""
        echo "Environment Variables Required:"
        echo "  SUPABASE_URL"
        echo "  SUPABASE_SERVICE_ROLE_KEY"
        echo "  PAYCHANGU_SECRET_KEY"
        echo ""
        echo "Examples:"
        echo "  export SUPABASE_URL=https://your-project.supabase.co"
        echo "  export SUPABASE_SERVICE_ROLE_KEY=your_service_key"
        echo "  export PAYCHANGU_SECRET_KEY=your_paychangu_secret"
        echo "  ./run_tests.sh"
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
