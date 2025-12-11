// Quick test script to verify support routes are loaded
const express = require('express');
const app = express();

// Load the routes
const moreRoutes = require('../routes/more');

// Mount routes
app.use('/api/more', moreRoutes);

// Test if routes are registered
console.log('🔍 Checking registered routes...\n');

const routes = [];
moreRoutes.stack.forEach((middleware) => {
  if (middleware.route) {
    const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
    routes.push(`${methods} /api/more${middleware.route.path}`);
  }
});

console.log('✅ Found routes:');
routes.forEach(route => console.log(`   ${route}`));

// Check for support routes specifically
const supportRoutes = routes.filter(r => r.includes('/support'));
console.log('\n🎫 Support-related routes:');
if (supportRoutes.length > 0) {
  supportRoutes.forEach(route => console.log(`   ✅ ${route}`));
} else {
  console.log('   ❌ No support routes found!');
}

console.log('\n📝 Expected routes:');
console.log('   ✅ POST /api/more/support/tickets');
console.log('   ✅ GET /api/more/support/tickets');
console.log('   ✅ GET /api/more/support/tickets/:id');
console.log('   ✅ POST /api/more/support/tickets/:id/message');
