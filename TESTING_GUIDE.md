# MSCE Learn Testing Guide

This guide covers the comprehensive testing framework for MSCE Learn, including RLS policy tests and payment flow tests to ensure security and functionality.

## Overview

The testing framework ensures:
- **RLS Policy Security**: Row Level Security policies work correctly
- **Payment Flow Integrity**: Webhook processing is secure and reliable
- **Access Control**: Users can only access their own data
- **Payment Security**: Webhook verification prevents fraud

## Test Structure

```
supabase/tests/
├── rls_policies.test.sql     # RLS policy tests (SQL)
├── payment_flow.test.ts      # Payment flow tests (TypeScript)
├── run_tests.sh              # Test runner script
└── TESTING_GUIDE.md          # This guide
```

## Environment Setup

### Required Environment Variables

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
export PAYCHANGU_SECRET_KEY="your_paychangu_secret_key"
```

### Prerequisites

1. **PostgreSQL Client** (psql) for SQL tests
2. **Deno** for TypeScript tests
3. **Supabase CLI** (optional, for local development)

```bash
# Install Deno
curl -fsSL https://deno.land/install.sh | sh

# Install PostgreSQL client (Ubuntu/Debian)
sudo apt install postgresql-client

# Install PostgreSQL client (macOS)
brew install libpq
```

## RLS Policy Tests (`rls_policies.test.sql`)

### Test Coverage

#### 1. Payments Table
- **Student Isolation**: Students cannot see other students' payments
- **Self Access**: Students can see their own payments
- **Write Protection**: Students cannot insert/update payments

#### 2. Enrollments Table
- **Student Isolation**: Students cannot see other students' enrollments
- **Self Access**: Students can see their own enrollments
- **Insert Protection**: Students cannot create enrollments directly

#### 3. Videos Table
- **Preview Access**: Unauthenticated users can see preview videos
- **Enrollment Access**: Students with valid enrollment can see all course videos
- **Expiration Check**: Students with expired enrollment cannot see paid videos
- **Course Isolation**: Students cannot see videos for unenrolled courses

#### 4. Audit Log Table
- **Student Restrictions**: Students cannot read audit logs
- **Write Protection**: Students cannot write to audit logs
- **Append-Only**: Admins cannot delete audit logs

#### 5. Profiles Table
- **Privacy**: Students cannot see other students' profiles
- **Self Access**: Students can see and update their own profile
- **Update Protection**: Students cannot update other students' profiles

### Running RLS Tests

```bash
# Run RLS tests only
./run_tests.sh sql

# Or with psql directly
psql $SUPABASE_URL -c "\i rls_policies.test.sql"
```

### Test Data Setup

The tests create and clean up their own data:

```sql
-- Test users
Student A: 00000000-0000-0000-0000-000000000001
Student B: 00000000-0000-0000-0000-000000000002
Admin:    00000000-0000-0000-0000-000000000003

-- Test courses
Mathematics: 00000000-0000-0000-0000-000000000010
Biology:    00000000-0000-0000-0000-000000000011
```

## Payment Flow Tests (`payment_flow.test.ts`)

### Test Coverage

#### 1. Valid Payment Flow
- **Signature Verification**: Valid HMAC signature accepted
- **Access Granting**: Successful payment creates enrollment
- **Status Updates**: Payment status updated to 'paid'
- **Enrollment Details**: Correct user, course, and expiration

#### 2. Security Tests
- **Invalid Signature**: 403 Forbidden for wrong signature
- **Missing Signature**: 400 Bad Request for missing header
- **Invalid JSON**: 400 Bad Request for malformed JSON
- **Amount Mismatch**: Payment marked as failed, no enrollment

#### 3. Edge Cases
- **Duplicate Webhook**: 200 OK but no duplicate enrollment
- **Failed Payment**: No enrollment created for failed status
- **Wrong Amount**: Payment rejected for amount mismatch

### Running Payment Tests

```bash
# Run payment flow tests only
./run_tests.sh ts

# Or with Deno directly
deno test --allow-net --allow-env payment_flow.test.ts
```

### Test Implementation

The tests use real Supabase Edge Functions:

```typescript
// Create valid webhook signature
const signature = await createSignature(payloadString, paychanguSecretKey)

// Call payment-callback endpoint
const response = await fetch(`${supabaseUrl}/functions/v1/payment-callback`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-paychangu-signature': signature
  },
  body: payloadString
})
```

## Test Runner (`run_tests.sh`)

### Usage

```bash
# Run all tests (default)
./run_tests.sh

# Run specific test types
./run_tests.sh sql    # RLS policy tests
./run_tests.sh ts     # Payment flow tests

# Environment management
./run_tests.sh setup   # Setup test environment
./run_tests.sh cleanup # Clean up test environment

# Show help
./run_tests.sh help
```

### Features

- **Environment Validation**: Checks required variables
- **Setup/Cleanup**: Automated test data management
- **Error Handling**: Clear error messages and exit codes
- **Test Reporting**: Success/failure reporting

## Test Scenarios

### Security Scenarios

#### 1. Data Isolation
```sql
-- Student A tries to access Student B's data
SELECT count(*) FROM payments WHERE user_id = 'student-b-id';
-- Expected: 0 rows (RLS blocks access)
```

#### 2. Payment Security
```typescript
// Invalid signature test
const invalidSignature = createSignature(payload, 'wrong-secret');
const response = await fetch('/payment-callback', {
  headers: { 'x-paychangu-signature': invalidSignature }
});
// Expected: 403 Forbidden
```

### Business Logic Scenarios

#### 1. Enrollment Creation
```typescript
// Valid payment should create enrollment
const enrollment = await supabase
  .from('enrollments')
  .select('*')
  .eq('user_id', testUser.id)
  .eq('course_id', testCourse.id)
  .single();
// Expected: enrollment exists with active status
```

#### 2. Preview Video Access
```sql
-- Unauthenticated user can see preview videos
SELECT count(*) FROM videos WHERE is_preview = true;
-- Expected: > 0 rows (preview videos accessible)
```

## Continuous Integration

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Deno
        run: curl -fsSL https://deno.land/install.sh | sh
        
      - name: Setup PostgreSQL
        run: sudo apt-get install postgresql-client
        
      - name: Run Tests
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          PAYCHANGU_SECRET_KEY: ${{ secrets.PAYCHANGU_SECRET_KEY }}
        run: ./supabase/tests/run_tests.sh
```

### Local Development

```bash
# Run tests before committing
./run_tests.sh

# Run specific test type during development
./run_tests.sh sql  # While working on RLS policies
./run_tests.sh ts   # While working on payment logic
```

## Test Data Management

### Test Data Isolation

Test data uses UUID patterns to avoid conflicts:
- Users: `00000000-0000-0000-0000-000000000001-003`
- Courses: `00000000-0000-0000-0000-000000000010-013`
- Videos: `00000000-0000-0000-0000-000000000020-024`
- Payments: `00000000-0000-0000-0000-000000000030-032`
- Enrollments: `00000000-0000-0000-0000-000000000040-042`

### Cleanup Strategy

Tests clean up their data automatically:
```sql
-- Remove test data in reverse dependency order
DELETE FROM audit_log WHERE user_id IN (test_users);
DELETE FROM enrollments WHERE user_id IN (test_users);
DELETE FROM payments WHERE user_id IN (test_users);
DELETE FROM profiles WHERE id IN (test_users);
DELETE FROM auth.users WHERE id IN (test_users);
```

## Security Testing Best Practices

### 1. Test All RLS Policies
- Every table with RLS should have tests
- Test both positive (allowed) and negative (blocked) cases
- Test with different user roles

### 2. Test Edge Cases
- Invalid input formats
- Missing required fields
- Boundary conditions
- Error scenarios

### 3. Test Business Logic
- Payment flow end-to-end
- Enrollment creation and expiration
- Video access based on enrollment status
- Preview video accessibility

### 4. Test Security Boundaries
- Cross-user data access attempts
- Privilege escalation attempts
- Invalid authentication scenarios
- SQL injection attempts

## Troubleshooting

### Common Issues

#### 1. Permission Denied Errors
```bash
# Check RLS policies are enabled
SELECT tablename, rowlevelsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

#### 2. Test Data Conflicts
```bash
# Clean up test environment
./run_tests.sh cleanup
./run_tests.sh setup
```

#### 3. Network Issues (TypeScript Tests)
```bash
# Check Supabase URL and keys
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

### Debug Mode

Enable verbose logging:
```bash
# SQL tests with verbose output
psql $SUPABASE_URL -c "\set VERBOSITY verbose" -c "\i rls_policies.test.sql"

# TypeScript tests with debug info
deno test --allow-net --allow-env --debug payment_flow.test.ts
```

## Test Coverage Report

### Current Coverage

| Table/Function | Tests | Coverage |
|----------------|-------|----------|
| payments | 4/4 | ✅ 100% |
| enrollments | 3/3 | ✅ 100% |
| videos | 5/5 | ✅ 100% |
| audit_log | 3/3 | ✅ 100% |
| profiles | 4/4 | ✅ 100% |
| payment-callback | 7/7 | ✅ 100% |

### Coverage Goals

- **RLS Policies**: 100% coverage required
- **Payment Flow**: 100% coverage required
- **Edge Cases**: All critical paths covered
- **Security Tests**: All attack vectors tested

## Future Enhancements

### Planned Tests

1. **Performance Tests**: Load testing for payment processing
2. **Integration Tests**: End-to-end user journey tests
3. **Security Tests**: Penetration testing scenarios
4. **API Tests**: All Edge Functions comprehensive testing

### Test Automation

1. **Scheduled Tests**: Daily test runs
2. **PR Validation**: Automatic testing on pull requests
3. **Release Testing**: Pre-deployment validation
4. **Monitoring**: Test results tracking and alerting

## Conclusion

The MSCE Learn testing framework provides comprehensive coverage of:
- **Security**: RLS policies and payment verification
- **Functionality**: Business logic and user workflows
- **Reliability**: Edge cases and error scenarios
- **Maintainability**: Automated test execution and cleanup

Regular execution of these tests ensures the platform remains secure, reliable, and compliant with business requirements.
