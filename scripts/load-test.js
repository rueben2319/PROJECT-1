import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const videoUrlErrors = new Rate('video_url_errors');
const paymentErrors = new Rate('payment_errors');
const loginErrors = new Rate('login_errors');

// Test configuration
export const options = {
  stages: [
    // Warmup phase
    { duration: '30s', target: 100 },
    // Ramp up to full load
    { duration: '1m', target: 500 },
    // Sustained load
    { duration: '2m', target: 1000 },
    // Ramp down
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95) < 800'], // 95% of requests under 800ms
    http_req_failed: ['rate < 0.01'], // Error rate under 1%
    http_reqs: ['rate > 500'], // Minimum 500 requests per second
    video_url_errors: ['rate < 0.02'], // Video URL errors under 2%
    paymentErrors: ['rate < 0.01'], // Payment errors under 1%
    loginErrors: ['rate < 0.005'], // Login errors under 0.5%
  },
  scenarios: {
    browse: {
      executor: 'shared-iterations',
      iterations: 1000,
      vus: 200,
      maxDuration: '5m',
      env: { SCENARIO: 'browse' },
    },
    video_url: {
      executor: 'shared-iterations',
      iterations: 500,
      vus: 100,
      maxDuration: '5m',
      env: { SCENARIO: 'video_url' },
    },
    payment_create: {
      executor: 'shared-iterations',
      iterations: 100,
      vus: 20,
      maxDuration: '5m',
      env: { SCENARIO: 'payment_create' },
    },
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'https://msce-learn.com';
const API_URL = __ENV.API_URL || 'https://msce-learn.com/api';

// Test users (for load testing - use test accounts)
const testUsers = [
  { email: 'loadtest1@example.com', password: 'TestPassword123!' },
  { email: 'loadtest2@example.com', password: 'TestPassword123!' },
  { email: 'loadtest3@example.com', password: 'TestPassword123!' },
  { email: 'loadtest4@example.com', password: 'TestPassword123!' },
  { email: 'loadtest5@example.com', password: 'TestPassword123!' },
];

// Test courses
const testCourses = [
  { id: '00000000-0000-0000-0000-000000000010', title: 'Mathematics Basics' },
  { id: '00000000-0000-0000-0000-000000000011', title: 'Biology Fundamentals' },
  { id: '00000000-0000-0000-0000-000000000012', title: 'Chemistry Essentials' },
];

// Helper functions
function getRandomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

function getRandomCourse() {
  return testCourses[Math.floor(Math.random() * testCourses.length)];
}

function makeRequest(method, url, body = null, headers = {}) {
  const params = {
    method: method,
    url: url,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'k6-load-test',
      ...headers,
    },
  };

  if (body) {
    params.body = JSON.stringify(body);
  }

  return http.request(params);
}

// Authentication
function login(user) {
  const response = makeRequest('POST', `${API_URL}/auth/login`, {
    email: user.email,
    password: user.password,
  });

  const success = check(response, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 500ms': (r) => r.timings.duration < 500,
    'login has token': (r) => r.json('access_token') !== undefined,
  });

  if (!success) {
    loginErrors.add(1);
  }

  return response.json('access_token');
}

// Browse scenario - light load
function browseScenario() {
  const user = getRandomUser();
  const token = login(user);
  
  const headers = {
    'Authorization': `Bearer ${token}`,
  };

  // Fetch courses
  const coursesResponse = makeRequest('GET', `${API_URL}/courses`, null, headers);
  check(coursesResponse, {
    'courses status is 200': (r) => r.status === 200,
    'courses response time < 300ms': (r) => r.timings.duration < 300,
    'courses has data': (r) => r.json('courses').length > 0,
  });

  // Fetch course detail
  const course = getRandomCourse();
  const courseResponse = makeRequest('GET', `${API_URL}/courses/${course.id}`, null, headers);
  check(courseResponse, {
    'course detail status is 200': (r) => r.status === 200,
    'course detail response time < 400ms': (r) => r.timings.duration < 400,
    'course detail has title': (r) => r.json('title') !== undefined,
  });

  sleep(1); // Think time between requests
}

// Video URL scenario - medium load
function videoUrlScenario() {
  const user = getRandomUser();
  const token = login(user);
  
  const headers = {
    'Authorization': `Bearer ${token}`,
  };

  const course = getRandomCourse();
  
  // Request video URL
  const videoResponse = makeRequest('POST', `${API_URL}/video-url`, {
    course_id: course.id,
    video_id: '00000000-0000-0000-0000-000000000020', // Test video ID
  }, headers);

  const success = check(videoResponse, {
    'video URL status is 200': (r) => r.status === 200,
    'video URL response time < 800ms': (r) => r.timings.duration < 800,
    'video URL has signed URL': (r) => r.json('signed_url') !== undefined,
  });

  if (!success) {
    videoUrlErrors.add(1);
  }

  sleep(2); // Think time for video loading
}

// Payment creation scenario - heavy load
function paymentCreateScenario() {
  const user = getRandomUser();
  const token = login(user);
  
  const headers = {
    'Authorization': `Bearer ${token}`,
  };

  const course = getRandomCourse();
  
  // Create payment
  const paymentResponse = makeRequest('POST', `${API_URL}/payments`, {
    course_id: course.id,
    phone_number: '0881234567',
    payment_method: 'airtel',
  }, headers);

  const success = check(paymentResponse, {
    'payment status is 200': (r) => r.status === 200,
    'payment response time < 2000ms': (r) => r.timings.duration < 2000,
    'payment has tx_ref': (r) => r.json('tx_ref') !== undefined,
  });

  if (!success) {
    paymentErrors.add(1);
  }

  sleep(3); // Think time for payment processing
}

// Main test function
export default function () {
  const scenario = __ENV.SCENARIO || 'browse';

  switch (scenario) {
    case 'browse':
      browseScenario();
      break;
    case 'video_url':
      videoUrlScenario();
      break;
    case 'payment_create':
      paymentCreateScenario();
      break;
    default:
      browseScenario();
  }
}

// Setup function
export function setup() {
  console.log('🚀 Starting MSCE Learn Load Test');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`📍 API URL: ${API_URL}`);
  console.log(`📍 Scenario: ${__ENV.SCENARIO || 'browse'}`);
  
  // Verify API is accessible
  const response = http.get(`${API_URL}/health`);
  if (response.status !== 200) {
    throw new Error('API health check failed');
  }
  
  console.log('✅ API health check passed');
}

// Teardown function
export function teardown() {
  console.log('🏁 Load test completed');
  console.log('📊 Check k6 output for detailed metrics');
}

// Handle errors
export function handleFailedRequest(request, error) {
  console.error(`Request failed: ${request.url} - ${error}`);
}
