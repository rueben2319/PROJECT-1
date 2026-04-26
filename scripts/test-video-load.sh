#!/bin/bash

# MSCE Learn Video Load Testing Script
# Tests video URL generation and HLS chunk download performance

set -e

# Configuration
BASE_URL="${BASE_URL:-https://msce-learn.com}"
API_URL="${API_URL:-https://msce-learn.com/api}"
TEST_USER_EMAIL="${TEST_USER_EMAIL:-test@example.com}"
TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-TestPassword123!}"
COURSE_ID="${COURSE_ID:-00000000-0000-0000-0000-000000000010}"
VIDEO_ID="${VIDEO_ID:-00000000-0000-0000-0000-000000000020}"
THROTTLE="${THROTTLE:-false}"  # Set to 'true' to enable 3G simulation

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        error "curl is not installed"
        exit 1
    fi
    
    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        error "jq is not installed"
        exit 1
    fi
    
    # Check if tc is available (for Linux throttling)
    if [[ "$THROTTLE" == "true" ]] && ! command -v tc &> /dev/null; then
        warning "tc not found, throttling disabled"
        THROTTLE="false"
    fi
    
    success "Prerequisites checked"
}

# Setup network throttling (Linux only)
setup_throttling() {
    if [[ "$THROTTLE" != "true" ]]; then
        return 0
    fi
    
    log "Setting up 3G network throttling..."
    
    # Check if running as root for tc
    if [[ $EUID -ne 0 ]]; then
        error "Network throttling requires root privileges"
        exit 1
    fi
    
    # Save current qdisc settings
    tc qdisc show dev lo > /tmp/qdisc_backup.txt 2>/dev/null || true
    
    # Apply 3G throttling (simulated 3G: 1Mbps down, 500Kbps up, 300ms RTT)
    tc qdisc add dev lo root handle 1: htb default 10
    tc class add dev lo parent 1: classid 1:1 htb rate 1mbit ceil 1mbit
    tc class add dev lo parent 1: classid 1:10 htb rate 1mbit ceil 1mbit
    tc qdisc add dev lo parent 1:10 handle 10: netem delay 300ms loss 0.5% duplicate 0.5%
    
    success "Network throttling enabled (3G simulation)"
}

# Cleanup network throttling
cleanup_throttling() {
    if [[ "$THROTTLE" != "true" ]]; then
        return 0
    fi
    
    log "Cleaning up network throttling..."
    
    # Restore original qdisc settings
    tc qdisc del dev lo root 2>/dev/null || true
    
    success "Network throttling disabled"
}

# User authentication
authenticate_user() {
    log "Authenticating user: $TEST_USER_EMAIL"
    
    local auth_response=$(curl -s -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\"}" \
        "$API_URL/auth/login")
    
    local http_code="${auth_response: -3}"
    local response_body="${auth_response%???}"
    
    if [[ "$http_code" != "200" ]]; then
        error "Authentication failed (HTTP $http_code)"
        echo "Response: $response_body"
        exit 1
    fi
    
    local token=$(echo "$response_body" | jq -r '.access_token')
    
    if [[ "$token" == "null" || -z "$token" ]]; then
        error "No token received"
        exit 1
    fi
    
    success "User authenticated"
    echo "$token"
}

# Get video signed URL
get_video_url() {
    local token="$1"
    
    log "Requesting video URL for course: $COURSE_ID, video: $VIDEO_ID"
    
    local start_time=$(date +%s%N)
    
    local url_response=$(curl -s -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -d "{\"course_id\":\"$COURSE_ID\",\"video_id\":\"$VIDEO_ID\"}" \
        "$API_URL/video-url")
    
    local http_code="${url_response: -3}"
    local response_body="${url_response%???}"
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    if [[ "$http_code" != "200" ]]; then
        error "Failed to get video URL (HTTP $http_code)"
        echo "Response: $response_body"
        exit 1
    fi
    
    local signed_url=$(echo "$response_body" | jq -r '.signed_url')
    
    if [[ "$signed_url" == "null" || -z "$signed_url" ]]; then
        error "No signed URL received"
        exit 1
    fi
    
    success "Video URL obtained (${duration}ms)"
    echo "$signed_url"
}

# Download HLS playlist
download_playlist() {
    local signed_url="$1"
    
    log "Downloading HLS playlist..."
    
    local start_time=$(date +%s%N)
    
    local playlist_response=$(curl -s -w "%{http_code}" "$signed_url")
    local http_code="${playlist_response: -3}"
    local response_body="${playlist_response%???}"
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))
    
    if [[ "$http_code" != "200" ]]; then
        error "Failed to download playlist (HTTP $http_code)"
        exit 1
    fi
    
    # Extract first chunk URL from playlist
    local chunk_url=$(echo "$response_body" | grep -E "chunk_0000\.ts" | head -1 | sed 's/.*\(http[^"]*\).*/\1/')
    
    if [[ -z "$chunk_url" ]]; then
        error "No chunk URL found in playlist"
        echo "Playlist content:"
        echo "$response_body"
        exit 1
    fi
    
    success "Playlist downloaded (${duration}ms)"
    echo "$chunk_url"
}

# Download first HLS chunk
download_chunk() {
    local chunk_url="$1"
    
    log "Downloading first HLS chunk: $(basename "$chunk_url")"
    
    local start_time=$(date +%s%N)
    
    local chunk_response=$(curl -s -w "%{http_code}\n%{size_download}\n%{time_total}" "$chunk_url")
    local response_array=($chunk_response)
    local http_code="${response_array[0]}"
    local size_bytes="${response_array[1]}"
    local total_time="${response_array[2]}"
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))
    
    if [[ "$http_code" != "200" ]]; then
        error "Failed to download chunk (HTTP $http_code)"
        exit 1
    fi
    
    if [[ "$size_bytes" -lt 1000 ]]; then
        error "Chunk size too small (${size_bytes} bytes)"
        exit 1
    fi
    
    success "Chunk downloaded (${size_bytes} bytes, ${duration}ms, ${total_time}s)"
    
    # Check if chunk is playable (basic MP4 header check)
    local temp_file="/tmp/test_chunk_$$"
    curl -s "$chunk_url" > "$temp_file"
    
    # Check for MP4 signature
    if file "$temp_file" | grep -q "MP4"; then
        success "Chunk appears to be valid MP4"
    elif file "$temp_file" | grep -q "MPEG"; then
        success "Chunk appears to be valid MPEG-TS"
    else
        warning "Chunk format might not be standard"
    fi
    
    rm -f "$temp_file"
    
    echo "$duration"
}

# Main test function
run_video_load_test() {
    log "Starting MSCE Learn Video Load Test"
    log "Base URL: $BASE_URL"
    log "API URL: $API_URL"
    log "Throttling: $THROTTLE"
    echo ""
    
    # Setup
    check_prerequisites
    setup_throttling
    
    # Test start time
    local test_start=$(date +%s)
    
    # Authentication
    local token=$(authenticate_user)
    
    # Get video URL
    local video_url=$(get_video_url "$token")
    
    # Download playlist
    local chunk_url=$(download_playlist "$video_url")
    
    # Download first chunk
    local chunk_download_time=$(download_chunk "$chunk_url")
    
    # Calculate total time
    local test_end=$(date +%s)
    local total_time=$((test_end - test_start))
    
    echo ""
    log "Test Results:"
    echo "  Total test time: ${total_time}s"
    echo "  First chunk download: ${chunk_download_time}ms"
    
    # Performance evaluation
    if [[ "$THROTTLE" == "true" ]]; then
        # 3G targets
        if [[ "$total_time" -le 8 ]]; then
            success "Performance target met (≤8s on 3G)"
        elif [[ "$total_time" -le 10 ]]; then
            warning "Performance acceptable (≤10s on 3G)"
        else
            error "Performance target missed (>10s on 3G)"
        fi
    else
        # Normal targets
        if [[ "$total_time" -le 4 ]]; then
            success "Performance target met (≤4s)"
        elif [[ "$total_time" -le 6 ]]; then
            warning "Performance acceptable (≤6s)"
        else
            error "Performance target missed (>6s)"
        fi
    fi
    
    # Cleanup
    cleanup_throttling
    
    echo ""
    success "Video load test completed"
}

# Network monitoring (optional)
monitor_network() {
    log "Network monitoring (if available)..."
    
    # Check network interface
    if command -v ip &> /dev/null; then
        local interface=$(ip route | grep default | awk '{print $5}')
        log "Default interface: $interface"
    fi
    
    # Check ping to API
    if command -v ping &> /dev/null; then
        local api_host=$(echo "$API_URL" | sed 's|https://||' | sed 's|/.*||')
        if ping -c 1 -W 1 "$api_host" &> /dev/null; then
            local ping_time=$(ping -c 1 -W 1 "$api_host" | grep "time=" | awk '{print $7}' | sed 's/time=//')
            success "API ping: ${ping_time}ms"
        else
            warning "API ping failed"
        fi
    fi
}

# Show usage
show_usage() {
    echo "MSCE Learn Video Load Testing Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -t, --throttle          Enable 3G network throttling (requires root)"
    echo "  -u, --url URL           Base URL (default: https://msce-learn.com)"
    echo "  -a, --api URL           API URL (default: https://msce-learn.com/api)"
    echo "  -e, --email EMAIL       Test user email"
    echo "  -p, --password PASSWORD Test user password"
    echo "  -c, --course ID         Course ID to test"
    echo "  -v, --video ID          Video ID to test"
    echo ""
    echo "Environment Variables:"
    echo "  BASE_URL                Base URL"
    echo "  API_URL                 API URL"
    echo "  TEST_USER_EMAIL         Test user email"
    echo "  TEST_USER_PASSWORD      Test user password"
    echo "  COURSE_ID               Course ID"
    echo "  VIDEO_ID                Video ID"
    echo "  THROTTLE                Enable throttling (true/false)"
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  $0 --throttle"
    echo "  $0 --url https://staging.msce-learn.com --throttle"
    echo "  THROTTLE=true $0"
    echo ""
    echo "Requirements:"
    echo "  - curl and jq"
    echo "  - tc (for throttling, requires root)"
    echo "  - Valid test user with enrollment"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -t|--throttle)
            THROTTLE="true"
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
        -e|--email)
            TEST_USER_EMAIL="$2"
            shift 2
            ;;
        -p|--password)
            TEST_USER_PASSWORD="$2"
            shift 2
            ;;
        -c|--course)
            COURSE_ID="$2"
            shift 2
            ;;
        -v|--video)
            VIDEO_ID="$2"
            shift 2
            ;;
        *)
            error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Trap cleanup on exit
trap cleanup_throttling EXIT

# Run the test
run_video_load_test
