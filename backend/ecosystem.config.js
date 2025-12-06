/**
 * PM2 Ecosystem Configuration File
 * 
 * This file is used to configure PM2 process manager for production deployment.
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [
    {
      name: 'tiktok-backend',
      script: './index.js',
      instances: 2, // Use 2 instances for load balancing
      exec_mode: 'cluster', // Cluster mode for better performance
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      
      // Development environment (override)
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      
      // Production environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      
      // Logging
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Process management
      autorestart: true,
      watch: false, // Set to true for development
      max_memory_restart: '1G', // Restart if memory exceeds 1GB
      
      // Advanced options
      min_uptime: '10s', // Minimum uptime before considering app stable
      max_restarts: 10, // Maximum restarts in 1 minute
      restart_delay: 4000, // Delay between restarts
      
      // Graceful shutdown
      kill_timeout: 5000, // Time to wait before force kill
      listen_timeout: 10000, // Time to wait for app to listen
      
      // Source map support
      source_map_support: true,
      
      // Instance variables
      instance_var: 'INSTANCE_ID'
    }
  ]
};
