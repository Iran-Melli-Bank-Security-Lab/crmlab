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
        CLIENT_URL: "https://crm.lab",
        CLIENT_URLS: "https://crm.lab",
        SOCKET_ALLOWED_ORIGINS: "https://crm.lab",
        COOKIE_SECURE: "true",
        COOKIE_SAME_SITE: "lax",
        TRUST_PROXY_HOPS: "1",
      },
    },
  ],
};
