# MSCE Learn Performance Testing Guide

This guide covers comprehensive performance testing for MSCE Learn, including load testing, Lighthouse CI, and video streaming performance optimization.

## Overview

Performance testing ensures MSCE Learn can handle expected user load while maintaining fast response times and excellent user experience. The testing strategy covers API performance, frontend performance, and video streaming performance.

## Testing Tools

### 1. k6 Load Testing
- **Purpose**: API load testing and stress testing
- **File**: `scripts/load-test.js`
- **Scenarios**: Browse, Video URL, Payment Creation
- **Metrics**: Response times, error rates, throughput

### 2. Lighthouse CI
- **Purpose**: Frontend performance auditing
- **File**: `.lighthouserc.json`
- **Scenarios**: Desktop, Mobile, 3G, Auth, Video pages
- **Metrics**: Performance scores, Core Web Vitals

### 3. Video Load Testing
- **Purpose**: Video streaming performance
- **File**: `scripts/test-video-load.sh`
- **Features**: Network throttling, HLS chunk timing
- **Metrics**: URL generation, chunk download, playback start

## k6 Load Testing

### Installation

```bash
# Install k6
curl -s https://dl.k6.io/key.txt | sudo apt-key add -
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Or download binary
curl -L https://github.com/k6io/k6/releases/latest/download/k6-v0.45.0-linux-amd64.tar.gz | tar xz -C /tmp
sudo mv /tmp/k6-v0.45.0-linux-amd64/k6 /usr/local/bin/
```

### Running Load Tests

```bash
# Set environment variables
export BASE_URL="https://msce-learn.com"
export API_URL="https://msce-learn.com/api"

# Run all scenarios
k6 run scripts/load-test.js

# Run specific scenario
k6 run --env SCENARIO=browse scripts/load-test.js
k6 run --env SCENARIO=video_url scripts/load-test.js
k6 run --env SCENARIO=payment_create scripts/load-test.js

# Run with custom options
k6 run --vus 500 --duration 5m scripts/load-test.js
```

### Load Test Scenarios

#### 1. Browse Scenario (Light Load)
- **Virtual Users**: 200
- **Iterations**: 1000
- **Actions**: Login → Fetch courses → Fetch course detail
- **Target**: 95th percentile < 500ms

#### 2. Video URL Scenario (Medium Load)
- **Virtual Users**: 100
- **Iterations**: 500
- **Actions**: Login → Request video signed URL
- **Target**: 95th percentile < 800ms

#### 3. Payment Creation Scenario (Heavy Load)
- **Virtual Users**: 20
- **Iterations**: 100
- **Actions**: Login → Create payment
- **Target**: 95th percentile < 2000ms

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time (95th percentile) | < 800ms | k6 metrics |
| Error Rate | < 1% | k6 metrics |
| Throughput | > 500 req/s | k6 metrics |
| Video URL Generation | < 800ms | k6 metrics |
| Payment Creation | < 2000ms | k6 metrics |

### Load Test Results Interpretation

```bash
# Example output interpretation
✓ http_req_duration.............: avg=342.45ms, min=12ms, med=298ms, max=2.1s, p(90)=512ms, p(95)=623ms, p(99.9)=1.8s
✓ http_req_failed.................: 0.23%  ✓ 23/10000
✓ http_reqs......................: 500.23/s

# Key metrics to watch:
# - p(95): 95th percentile response time
# - http_req_failed: Error rate percentage
# - http_reqs: Requests per second
```

## Lighthouse CI Testing

### Installation

```bash
# Install Lighthouse CI
npm install -g @lhci/cli@0.12.x

# Initialize Lighthouse CI (first time only)
lhci autorun
```

### Configuration

The `.lighthouserc.json` includes multiple scenarios:

- **Default**: Desktop performance testing
- **3G**: Simulated 3G network testing
- **Mobile**: Mobile device testing
- **Auth**: Authentication pages testing
- **Video**: Video page testing

### Running Lighthouse Tests

```bash
# Start development server
npm run dev

# Run default tests
lhci autorun

# Run specific scenario
lhci autorun --config=.lighthouserc.json:ci:3g
lhci autorun --config=.lighthouserc.json:ci:mobile
lhci autorun --config=.lighthouserc.json:ci:auth
lhci autorun --config=.lighthouserc.json:ci:video
```

### Performance Targets

| Metric | Desktop | 3G | Mobile |
|--------|---------|----|--------|
| Performance Score | ≥ 80 | ≥ 60 | ≥ 70 |
| First Contentful Paint | ≤ 1.5s | ≤ 3s | ≤ 2.5s |
| Time to Interactive | ≤ 3s | ≤ 5s | ≤ 4.5s |
| Speed Index | ≤ 2.5s | ≤ 4s | ≤ 3.5s |
| Largest Contentful Paint | ≤ 2s | ≤ 3.5s | ≤ 3s |

### Lighthouse CI Integration

```yaml
# GitHub Actions example
name: Lighthouse CI
on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli@0.12.x
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

## Video Load Testing

### Prerequisites

```bash
# Install required tools
sudo apt install curl jq

# For network throttling (Linux)
sudo apt install iproute2
```

### Running Video Load Tests

```bash
# Basic test
./scripts/test-video-load.sh

# With 3G throttling (requires root)
sudo ./scripts/test-video-load.sh --throttle

# Custom configuration
./scripts/test-video-load.sh \
  --url https://staging.msce-learn.com \
  --email test@example.com \
  --password TestPassword123! \
  --throttle
```

### Test Process

1. **Authentication**: User login and token generation
2. **Video URL Request**: Signed URL generation timing
3. **Playlist Download**: HLS playlist retrieval
4. **Chunk Download**: First video chunk download
5. **Validation**: Chunk format and playability verification

### Performance Targets

| Metric | Normal | 3G |
|--------|--------|----|
| Total Load Time | ≤ 4s | ≤ 8s |
| URL Generation | ≤ 500ms | ≤ 1s |
| Playlist Download | ≤ 500ms | ≤ 1s |
| First Chunk | ≤ 3s | ≤ 6s |
| Chunk Size | ≥ 1MB | ≥ 1MB |

### Network Throttling

The script supports 3G network simulation using Linux `tc`:

```bash
# 3G Simulation Parameters
- Download: 1 Mbps
- Upload: 500 Kbps  
- Latency: 300ms RTT
- Packet Loss: 0.5%
- Jitter: 0.5% duplicate packets
```

## Performance Optimization

### Frontend Optimization

#### 1. Code Splitting
```javascript
// Implement lazy loading for components
const VideoPlayer = lazy(() => import('./components/VideoPlayer'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
```

#### 2. Image Optimization
```javascript
// Use WebP format with fallbacks
<picture>
  <source srcset="image.webp" type="image/webp">
  <source srcset="image.jpg" type="image/jpeg">
  <img src="image.jpg" alt="Description" loading="lazy">
</picture>
```

#### 3. Bundle Optimization
```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@headlessui/react', '@heroicons/react']
        }
      }
    }
  }
}
```

### Backend Optimization

#### 1. Database Indexing
```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_enrollments_user_course 
ON enrollments(user_id, course_id);

CREATE INDEX CONCURRENTLY idx_payments_user_status 
ON payments(user_id, status);

CREATE INDEX CONCURRENTLY idx_videos_course_published 
ON videos(course_id, published);
```

#### 2. Caching Strategy
```typescript
// Implement Redis caching for expensive queries
const cacheKey = `courses:${subject}:${grade}`;
let courses = await redis.get(cacheKey);

if (!courses) {
  courses = await db.query('SELECT * FROM courses WHERE...');
  await redis.setex(cacheKey, 300, JSON.stringify(courses));
}
```

#### 3. Connection Pooling
```typescript
// Optimize database connection pool
const supabase = createClient(url, key, {
  db: {
    poolSize: 20,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  }
});
```

### Video Optimization

#### 1. HLS Optimization
```bash
# Optimize FFmpeg settings for streaming
ffmpeg -i input.mp4 \
  -c:v libx264 -preset fast -crf 23 \
  -c:a aac -b:a 128k \
  -vf "scale=1280:720" \
  -hls_time 10 \
  -hls_list_size 0 \
  -hls_segment_filename chunk_%04d.ts \
  output.m3u8
```

#### 2. CDN Configuration
```javascript
// Configure Cloudflare R2 with CDN
const videoUrl = `https://pub-${bucketId}.r2.dev/${path}`;
const cdnUrl = `https://cdn.msce-learn.com/${path}`;
```

#### 3. Adaptive Bitrate
```bash
# Create multiple quality levels
ffmpeg -i input.mp4 \
  -vf "scale=1280:720" -c:v libx264 -preset fast -crf 23 \
  -vf "scale=854:480" -c:v libx264 -preset fast -crf 26 \
  -vf "scale=640:360" -c:v libx264 -preset fast -crf 28 \
  master.m3u8
```

## Monitoring & Alerting

### Performance Monitoring

#### 1. Real User Monitoring (RUM)
```javascript
// Implement RUM with Sentry or similar
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'your-dsn',
  tracesSampleRate: 0.1,
  integrations: [new Sentry.BrowserTracing()]
});
```

#### 2. Synthetic Monitoring
```bash
# Use UptimeRobot or similar
curl -I https://msce-learn.com/api/health
```

#### 3. Database Monitoring
```sql
-- Monitor slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE mean_time > 100 
ORDER BY mean_time DESC;
```

### Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| API Response Time | > 1s | > 2s |
| Error Rate | > 2% | > 5% |
| Database Connections | > 80% | > 95% |
| Video Load Time | > 5s | > 10s |
| Memory Usage | > 80% | > 95% |

## Continuous Performance Testing

### CI/CD Integration

```yaml
# GitHub Actions workflow
name: Performance Tests
on: [push, pull_request]

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run k6 tests
        run: k6 run scripts/load-test.js
        env:
          BASE_URL: ${{ secrets.BASE_URL }}
          API_URL: ${{ secrets.API_URL }}

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Lighthouse CI
        run: lhci autorun
```

### Performance Budgets

```javascript
// Define performance budgets
module.exports = {
  extends: '@lhci/default',
  ci: {
    collect: {
      settings: {
        budgets: [
          {
            path: '/*',
            resourceSizes: [
              {
                resourceType: 'script',
                budget: 300000
              },
              {
                resourceType: 'total',
                budget: 1000000
              }
            ]
          }
        ]
      }
    }
  }
};
```

### Regression Detection

```bash
# Compare performance over time
k6 run --out json=results.json scripts/load-test.js
k6 compare results.json baseline.json

# Set performance regression alerts
if [ $(k6 run --out json=results.json scripts/load-test.js | jq '.metrics.http_req_duration.values.p95') -gt 800 ]; then
  echo "Performance regression detected!"
  exit 1
fi
```

## Troubleshooting

### Common Performance Issues

#### 1. Slow API Responses
```bash
# Check database queries
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10"

# Check connection pool
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity"
```

#### 2. Video Streaming Issues
```bash
# Test video URL generation
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -d '{"course_id":"uuid","video_id":"uuid"}' \
  https://msce-learn.com/api/video-url

# Test HLS playlist
curl -I https://cdn.msce-learn.com/courses/math/playlist.m3u8
```

#### 3. Frontend Performance
```bash
# Analyze bundle size
npm run build --analyze

# Check Lighthouse scores
lhci autorun --config=.lighthouserc.json:ci
```

### Performance Debugging Tools

1. **Chrome DevTools**: Network and Performance tabs
2. **WebPageTest**: Detailed performance analysis
3. **GTmetrix**: Performance monitoring
4. **k6 Cloud**: Load testing visualization
5. **Lighthouse Viewer**: Lighthouse result analysis

## Best Practices

### Testing Best Practices
- Test realistic user scenarios
- Include network throttling
- Test across different devices
- Monitor performance continuously
- Set up automated regression testing

### Optimization Best Practices
- Optimize critical rendering path
- Implement lazy loading
- Use efficient caching strategies
- Optimize images and videos
- Minimize bundle size

### Monitoring Best Practices
- Monitor real user performance
- Set up meaningful alerts
- Track performance trends
- Use synthetic monitoring
- Regular performance audits

This comprehensive performance testing strategy ensures MSCE Learn delivers fast, reliable performance for all users while maintaining excellent video streaming quality.
