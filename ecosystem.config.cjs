module.exports = {
  apps: [
    {
      name: 'incubator-api',
      script: 'src/server.js',
      cwd: '/var/www/incubator/backend',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/incubator/error.log',
      out_file: '/var/log/incubator/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
