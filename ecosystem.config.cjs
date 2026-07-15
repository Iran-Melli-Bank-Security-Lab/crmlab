module.exports = {
  apps: [
    {
      name: "crmlab-api",
      cwd: "/home/slb/crmlab/apps/api",
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "1G",
      env_production: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: "4000",
        CLIENT_URL: "http://10.10.10.122",
        CLIENT_URLS: "http://10.10.10.122",
        SOCKET_ALLOWED_ORIGINS: "http://10.10.10.122",
        COOKIE_SECURE: "false",
        COOKIE_SAME_SITE: "lax",
        TRUST_PROXY_HOPS: "1",
        UPLOAD_DIR: "/var/lib/crmlab/uploads",
      },
    },
  ],
};
