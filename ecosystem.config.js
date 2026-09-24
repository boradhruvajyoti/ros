module.exports = {
  apps: [
    {
      name: 'ros-api',
      cwd: './apps/api',
      script: 'dist/server.js',
      exec_mode: 'cluster',
      instances: process.env.API_INSTANCES || 'max',
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
      exec_mode: 'cluster',
      instances: process.env.WEB_INSTANCES || 'max',
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
