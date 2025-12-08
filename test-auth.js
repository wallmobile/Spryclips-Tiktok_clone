const axios = require('axios');

const API_URL = 'https://spryclips.com/api/auth';

// Test data
const timestamp = Date.now();
const testUser = {
  username: `testuser${timestamp}`,
  email: `test${timestamp}@test.com`,
  password: 'Test123!@',
  confirmPassword: 'Test123!@'
};

async function testSignup() {
  console.log('\n=== Testing Signup ===');
  console.log('Test User:', testUser);
  
  try {
    const response = await axios.post(`${API_URL}/register`, {
      username: testUser.username,
      email: testUser.email,
      password: testUser.password,
      confirmPassword: testUser.confirmPassword
    });
    
    console.log('✅ Signup Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return { success: true, data: response.data, user: testUser };
  } catch (error) {
    console.log('❌ Signup Failed!');
    console.log('Error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

async function testLogin(email, password) {
  console.log('\n=== Testing Login ===');
  console.log('Email:', email);
  
  try {
    const response = await axios.post(`${API_URL}/login`, {
      email,
      password
    });
    
    console.log('✅ Login Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return { success: true, data: response.data };
  } catch (error) {
    console.log('❌ Login Failed!');
    console.log('Error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

async function testInvalidSignup() {
  console.log('\n=== Testing Invalid Signup (Duplicate Email) ===');
  
  try {
    const response = await axios.post(`${API_URL}/register`, {
      username: `testuser${Date.now()}`,
      email: testUser.email, // Duplicate email
      password: 'Test123!@',
      confirmPassword: 'Test123!@'
    });
    
    console.log('❌ Should have failed but succeeded!');
    return { success: false };
  } catch (error) {
    console.log('✅ Correctly rejected duplicate email');
    console.log('Error:', error.response?.data || error.message);
    return { success: true, error: error.response?.data };
  }
}

async function testInvalidLogin() {
  console.log('\n=== Testing Invalid Login (Wrong Password) ===');
  
  try {
    const response = await axios.post(`${API_URL}/login`, {
      email: testUser.email,
      password: 'WrongPassword123!@'
    });
    
    console.log('❌ Should have failed but succeeded!');
    return { success: false };
  } catch (error) {
    console.log('✅ Correctly rejected wrong password');
    console.log('Error:', error.response?.data || error.message);
    return { success: true, error: error.response?.data };
  }
}

async function runTests() {
  console.log('🚀 Starting Authentication Tests...\n');
  
  // Test 1: Signup
  const signupResult = await testSignup();
  
  if (signupResult.success) {
    // Test 2: Login with correct credentials
    await testLogin(testUser.email, testUser.password);
    
    // Test 3: Invalid login
    await testInvalidLogin();
    
    // Test 4: Duplicate signup
    await testInvalidSignup();
  }
  
  console.log('\n✅ All tests completed!');
}

runTests().catch(console.error);

