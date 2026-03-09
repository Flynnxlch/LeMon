module.exports = {
  apps: [
    {
      name: 'trackstu',
      script: 'backend/src/index.js',
      node_args: '--env-file=backend/.env',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
