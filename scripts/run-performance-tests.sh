#!/bin/bash

# MSCE Learn Performance Test Runner
# Runs all performance tests and generates a comprehensive report

set -e

# Configuration
BASE_URL="${BASE_URL:-https://msce-learn.com}"
API_URL="${API_URL:-https://msce-learn.com/api}"
REPORT_DIR="${REPORT_DIR:-./performance-reports}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$REPORT_DIR/performance_report_$TIMESTAMP.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

header() {
    echo -e "${PURPLE}🚀 $1${NC}"
}

# Create report directory
mkdir -p "$REPORT_DIR"

# Initialize report
init_report() {
    cat > "$REPORT_FILE" << EOF
# MSCE Learn Performance Report

**Generated:** $(date)
**Base URL:** $BASE_URL
**API URL:** $API_URL

## Executive Summary

EOF
}

# Add section to report
add_section() {
    echo -e "\n## $1\n" >> "$REPORT_FILE"
    echo "$2" >> "$REPORT_FILE"
}

# Check prerequisites
check_prerequisites() {
    header "Checking Prerequisites"
    
    local missing_tools=()
    
    # Check for k6
    if ! command -v k6 &> /dev/null; then
        missing_tools+=("k6")
    fi
    
    # Check for npm/lhci
    if ! command -v npm &> /dev/null || ! npm list -g @lhci/cli &> /dev/null; then
        missing_tools+=("@lhci/cli")
    fi
    
    # Check for curl
    if ! command -v curl &> /dev/null; then
        missing_tools+=("curl")
    fi
    
    # Check for jq
    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        error "Missing tools: ${missing_tools[*]}"
        echo ""
        echo "Install missing tools:"
        echo "  k6: curl -s https://dl.k6.io/key.txt | sudo apt-key add - && sudo apt-get update && sudo apt-get install k6"
        echo "  @lhci/cli: npm install -g @lhci/cli@0.12.x"
        echo "  curl: sudo apt install curl"
        echo "  jq: sudo apt install jq"
        exit 1
    fi
    
    success "All prerequisites checked"
}

# Health check
health_check() {
    header "Health Check"
    
    log "Checking API health..."
    
    local health_response=$(curl -s -w "%{http_code}" "$API_URL/health" 2>/dev/null)
    local http_code="${health_response: -3}"
    
    if [ "$http_code" = "200" ]; then
        success "API health check passed"
        add_section "Health Check" "✅ API is healthy and responding"
    else
        error "API health check failed (HTTP $http_code)"
        add_section "Health Check" "❌ API health check failed (HTTP $http_code)"
        exit 1
    fi
    
    log "Checking frontend..."
    local frontend_response=$(curl -s -w "%{http_code}" "$BASE_URL" 2>/dev/null)
    local frontend_code="${frontend_response: -3}"
    
    if [ "$frontend_code" = "200" ]; then
        success "Frontend health check passed"
        echo "✅ Frontend is healthy" >> "$REPORT_FILE"
    else
        warning "Frontend health check failed (HTTP $frontend_code)"
        echo "⚠️ Frontend health check failed (HTTP $frontend_code)" >> "$REPORT_FILE"
    fi
}

# Run k6 load tests
run_load_tests() {
    header "Running Load Tests"
    
    log "Starting k6 load tests..."
    
    # Create temporary file for results
    local temp_results="/tmp/k6_results_$TIMESTAMP.json"
    
    # Run load tests
    if k6 run --out json="$temp_results" scripts/load-test.js 2>/dev/null; then
        success "Load tests completed"
        
        # Extract key metrics
        local p95_duration=$(jq -r '.metrics.http_req_duration.values."p(95)" // "N/A"' "$temp_results")
        local error_rate=$(jq -r '.metrics.http_req_failed.rate // "N/A"' "$temp_results")
        local throughput=$(jq -r '.metrics.http_reqs.rate // "N/A"' "$temp_results")
        
        # Add to report
        add_section "Load Test Results" << EOF
- **95th Percentile Response Time**: ${p95_duration}ms
- **Error Rate**: ${error_rate}%
- **Throughput**: ${throughput} req/s

### Performance Targets
- Target 95th percentile: < 800ms
- Target error rate: < 1%
- Target throughput: > 500 req/s

### Assessment
EOF
        
        # Evaluate performance
        local performance_score=0
        local max_score=3
        
        # Check response time
        if [[ "$p95_duration" != "N/A" && $(echo "$p95_duration < 800" | bc -l) -eq 1 ]]; then
            echo "✅ Response time target met (${p95_duration}ms)" >> "$REPORT_FILE"
            performance_score=$((performance_score + 1))
        else
            echo "❌ Response time target missed (${p95_duration}ms)" >> "$REPORT_FILE"
        fi
        
        # Check error rate
        if [[ "$error_rate" != "N/A" && $(echo "$error_rate < 1" | bc -l) -eq 1 ]]; then
            echo "✅ Error rate target met (${error_rate}%)" >> "$REPORT_FILE"
            performance_score=$((performance_score + 1))
        else
            echo "❌ Error rate target missed (${error_rate}%)" >> "$REPORT_FILE"
        fi
        
        # Check throughput
        if [[ "$throughput" != "N/A" && $(echo "$throughput > 500" | bc -l) -eq 1 ]]; then
            echo "✅ Throughput target met (${throughput} req/s)" >> "$REPORT_FILE"
            performance_score=$((performance_score + 1))
        else
            echo "❌ Throughput target missed (${throughput} req/s)" >> "$REPORT_FILE"
        fi
        
        echo "" >> "$REPORT_FILE"
        echo "**Load Test Score**: $performance_score/$max_score" >> "$REPORT_FILE"
        
        if [ $performance_score -eq $max_score ]; then
            success "All load test targets met"
        else
            warning "Some load test targets missed"
        fi
        
    else
        error "Load tests failed"
        add_section "Load Test Results" "❌ Load tests failed to complete"
        return 1
    fi
    
    # Clean up
    rm -f "$temp_results"
}

# Run Lighthouse tests
run_lighthouse_tests() {
    header "Running Lighthouse Tests"
    
    log "Starting Lighthouse CI tests..."
    
    # Check if development server is running
    if ! curl -s "http://localhost:5173" > /dev/null; then
        warning "Development server not running on localhost:5173"
        warning "Skipping Lighthouse tests"
        add_section "Lighthouse Tests" "⚠️ Skipped (development server not running)"
        return 0
    fi
    
    # Create temporary directory for Lighthouse results
    local lighthouse_dir="/tmp/lighthouse_$TIMESTAMP"
    mkdir -p "$lighthouse_dir"
    
    # Run Lighthouse tests
    if lhci autorun --config=.lighthouserc.json --output="$lighthouse_dir" 2>/dev/null; then
        success "Lighthouse tests completed"
        
        # Extract results from LHCI output
        local lighthouse_report="$lighthouse_dir/lhr-*.json"
        
        if [ -f "$lighthouse_report" ]; then
            local performance_score=$(jq -r '.categories.performance.score * 100' "$lighthouse_report")
            local fcp=$(jq -r '.audits["first-contentful-paint"].numericValue' "$lighthouse_report")
            local tti=$(jq -r '.audits.interactive.numericValue' "$lighthouse_report")
            
            add_section "Lighthouse Results" << EOF
- **Performance Score**: ${performance_score}
- **First Contentful Paint**: ${fcp}ms
- **Time to Interactive**: ${tti}ms

### Performance Targets
- Target performance score: ≥ 80
- Target FCP: ≤ 3s
- Target TTI: ≤ 5s

### Assessment
EOF
            
            # Evaluate Lighthouse performance
            local lighthouse_score=0
            local max_lighthouse=3
            
            if (( $(echo "$performance_score >= 80" | bc -l) )); then
                echo "✅ Performance score target met (${performance_score})" >> "$REPORT_FILE"
                lighthouse_score=$((lighthouse_score + 1))
            else
                echo "❌ Performance score target missed (${performance_score})" >> "$REPORT_FILE"
            fi
            
            if (( $(echo "$fcp <= 3000" | bc -l) )); then
                echo "✅ FCP target met (${fcp}ms)" >> "$REPORT_FILE"
                lighthouse_score=$((lighthouse_score + 1))
            else
                echo "❌ FCP target missed (${fcp}ms)" >> "$REPORT_FILE"
            fi
            
            if (( $(echo "$tti <= 5000" | bc -l) )); then
                echo "✅ TTI target met (${tti}ms)" >> "$REPORT_FILE"
                lighthouse_score=$((lighthouse_score + 1))
            else
                echo "❌ TTI target missed (${tti}ms)" >> "$REPORT_FILE"
            fi
            
            echo "" >> "$REPORT_FILE"
            echo "**Lighthouse Score**: $lighthouse_score/$max_lighthouse" >> "$REPORT_FILE"
            
            if [ $lighthouse_score -eq $max_lighthouse ]; then
                success "All Lighthouse targets met"
            else
                warning "Some Lighthouse targets missed"
            fi
        else
            warning "Lighthouse results not found"
            add_section "Lighthouse Tests" "⚠️ Tests completed but results not available"
        fi
    else
        error "Lighthouse tests failed"
        add_section "Lighthouse Tests" "❌ Lighthouse tests failed"
        return 1
    fi
    
    # Clean up
    rm -rf "$lighthouse_dir"
}

# Run video load tests
run_video_tests() {
    header "Running Video Load Tests"
    
    log "Starting video load tests..."
    
    # Run video load test
    if ./scripts/test-video-load.sh > /tmp/video_test_$TIMESTAMP.log 2>&1; then
        success "Video load tests completed"
        
        # Extract results from log
        local test_log="/tmp/video_test_$TIMESTAMP.log"
        local total_time=$(grep "Total test time:" "$test_log" | awk '{print $4}')
        local chunk_time=$(grep "First chunk download:" "$test_log" | awk '{print $4}')
        
        add_section "Video Load Test Results" << EOF
- **Total Load Time**: ${total_time}s
- **First Chunk Download**: ${chunk_time}ms

### Performance Targets
- Target total time: ≤ 4s (normal), ≤ 8s (3G)
- Target chunk download: ≤ 3s (normal), ≤ 6s (3G)

### Assessment
EOF
        
        # Evaluate video performance
        local video_score=0
        local max_video=2
        
        if [[ "$total_time" != "" && $(echo "$total_time <= 4" | bc -l) -eq 1 ]]; then
            echo "✅ Total time target met (${total_time}s)" >> "$REPORT_FILE"
            video_score=$((video_score + 1))
        else
            echo "❌ Total time target missed (${total_time}s)" >> "$REPORT_FILE"
        fi
        
        if [[ "$chunk_time" != "" && $(echo "$chunk_time <= 3000" | bc -l) -eq 1 ]]; then
            echo "✅ Chunk download target met (${chunk_time}ms)" >> "$REPORT_FILE"
            video_score=$((video_score + 1))
        else
            echo "❌ Chunk download target missed (${chunk_time}ms)" >> "$REPORT_FILE"
        fi
        
        echo "" >> "$REPORT_FILE"
        echo "**Video Load Score**: $video_score/$max_video" >> "$REPORT_FILE"
        
        if [ $video_score -eq $max_video ]; then
            success "All video load targets met"
        else
            warning "Some video load targets missed"
        fi
        
    else
        error "Video load tests failed"
        add_section "Video Load Test Results" "❌ Video load tests failed"
        return 1
    fi
    
    # Clean up
    rm -f "/tmp/video_test_$TIMESTAMP.log"
}

# Generate summary
generate_summary() {
    header "Generating Performance Summary"
    
    add_section "Overall Assessment" << EOF
This performance test evaluated MSCE Learn across three key areas:

1. **Load Testing**: API performance under stress
2. **Frontend Performance**: User experience metrics
3. **Video Streaming**: Video loading and playback performance

### Recommendations

Based on the test results, consider the following optimizations:

#### If Load Tests Failed:
- Review database query performance
- Implement caching strategies
- Optimize API endpoints
- Scale infrastructure if needed

#### If Lighthouse Tests Failed:
- Optimize bundle size
- Implement lazy loading
- Optimize images and assets
- Improve server response times

#### If Video Tests Failed:
- Optimize video encoding
- Improve CDN performance
- Implement adaptive bitrate streaming
- Optimize signed URL generation

### Next Steps

1. Address any failed performance targets
2. Implement recommended optimizations
3. Re-run performance tests
4. Establish continuous performance monitoring
5. Set up performance regression alerts

---

**Report Generated**: $(date)
**Environment**: $BASE_URL
EOF
    
    success "Performance report generated: $REPORT_FILE"
}

# Show usage
show_usage() {
    echo "MSCE Learn Performance Test Runner"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -l, --load-only         Run only load tests"
    echo "  -f, --frontend-only     Run only Lighthouse tests"
    echo "  -v, --video-only        Run only video load tests"
    echo "  -u, --url URL           Base URL (default: https://msce-learn.com)"
    echo "  -a, --api URL           API URL (default: https://msce-learn.com/api)"
    echo "  -r, --report-dir DIR    Report directory (default: ./performance-reports)"
    echo ""
    echo "Environment Variables:"
    echo "  BASE_URL                Base URL"
    echo "  API_URL                 API URL"
    echo "  REPORT_DIR              Report directory"
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  $0 --load-only"
    echo "  $0 --url https://staging.msce-learn.com"
    echo "  BASE_URL=https://staging.msce-learn.com $0"
}

# Parse command line arguments
LOAD_ONLY=false
FRONTEND_ONLY=false
VIDEO_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -l|--load-only)
            LOAD_ONLY=true
            shift
            ;;
        -f|--frontend-only)
            FRONTEND_ONLY=true
            shift
            ;;
        -v|--video-only)
            VIDEO_ONLY=true
            shift
            ;;
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -a|--api)
            API_URL="$2"
            shift 2
            ;;
        -r|--report-dir)
            REPORT_DIR="$2"
            shift 2
            ;;
        *)
            error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    header "MSCE Learn Performance Testing"
    echo ""
    log "Base URL: $BASE_URL"
    log "API URL: $API_URL"
    log "Report Directory: $REPORT_DIR"
    echo ""
    
    # Initialize report
    init_report
    
    # Check prerequisites
    check_prerequisites
    
    # Health check
    health_check
    
    # Run tests based on options
    if [ "$LOAD_ONLY" = true ]; then
        run_load_tests
    elif [ "$FRONTEND_ONLY" = true ]; then
        run_lighthouse_tests
    elif [ "$VIDEO_ONLY" = true ]; then
        run_video_tests
    else
        run_load_tests
        run_lighthouse_tests
        run_video_tests
    fi
    
    # Generate summary
    generate_summary
    
    echo ""
    header "Performance Testing Complete"
    echo "📊 Report: $REPORT_FILE"
    echo ""
    success "All performance tests completed"
}

# Run main function
main
