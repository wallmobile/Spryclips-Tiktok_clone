/**
 * Test Socket.IO Connection
 * Run with: node test-socket.js
 */

const io = require('socket.io-client');

// Test connection
const socket = io('http://localhost:5000', {
  transports: ['polling', 'websocket'],
  reconnection: true
});

socket.on('connect', () => {
  console.log('✅ Socket connected successfully!');
  console.log('Socket ID:', socket.id);
  console.log('Transport:', socket.io.engine.transport.name);
  
  // Test joining a room
  socket.emit('join:conversation', 'test-conversation-123');
  console.log('Sent join:conversation event');
});

socket.on('conversation:joined', (data) => {
  console.log('✅ Room joined:', data);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});

socket.on('message:new', (data) => {
  console.log('📨 Message received:', data);
});

// Keep process running
console.log('Testing socket connection to http://localhost:5000...');
console.log('Press Ctrl+C to exit');

// Simulate sending a message after 2 seconds
setTimeout(() => {
  console.log('\nTesting message emit...');
  socket.emit('test:message', { text: 'Hello from test!' });
}, 2000);
