module.exports = {
  apps: [
    {
      name: 'ros-api',
      cwd: './apps/api',
      script: 'server.js',
      exec_mode: 'cluster',
      instances: process.env.API_INSTANCES || 'max', // Scales API across all CPU cores
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
      script: 'server.js',
      exec_mode: 'fork', // Next.js standard production daemon (handles internal async request pooling)
      instances: 1,
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
