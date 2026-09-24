module.exports = {
  apps: [
    {
      name: 'ros-api',
      cwd: './apps/api',
      script: 'dist/server.js',
      exec_mode: 'cluster',
      instances: process.env.API_INSTANCES || 'max', // Scales across all CPU cores automatically
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
    {
      name: 'ros-web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      exec_mode: 'cluster',
      instances: process.env.WEB_INSTANCES || 'max', // Scales across all CPU cores automatically
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
