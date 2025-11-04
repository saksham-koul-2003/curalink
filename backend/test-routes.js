// Debug script to test route registration
const express = require('express');
const app = express();

const trialsRoutes = require('./src/routes/trials');

app.use('/api/trials', trialsRoutes);

// Log all registered routes
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log(`${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    middleware.handle.stack.forEach((handler) => {
      if (handler.route) {
        console.log(`${Object.keys(handler.route.methods).join(', ').toUpperCase()} /api/trials${handler.route.path}`);
      }
    });
  }
});

console.log('\nRoute registration test complete');

