# Production deployment (`10.10.10.122`)

The production topology is a single HTTP origin:

- Frontend: `http://10.10.10.122`
- REST API: `http://10.10.10.122/api`
- WebSocket: `http://10.10.10.122/socket.io`
- Uploaded files: `http://10.10.10.122/uploads`
- Private backend listener: `0.0.0.0:4000`

Nginx serves the built SPA and proxies API, uploads, and Socket.IO to the Node
process. React Router refreshes fall back to `index.html`.

## Server setup

Run from `/var/www/crmlab` after installing Node.js, MongoDB, Nginx, and PM2:

```bash
npm ci
cp apps/api/.env.production.example apps/api/.env
```

Replace every secret placeholder in `apps/api/.env` with an independent random
value of at least 32 characters. Keep that file on the server; it is gitignored.
Confirm the MongoDB URI and create the persistent upload directory with ownership
for the account running PM2.

```bash
npm run build
pm2 start ecosystem.config.cjs --env production
pm2 save
sudo ln -s /var/www/crmlab/deploy/nginx/crmlab.conf /etc/nginx/sites-enabled/crmlab.conf
sudo nginx -t
sudo systemctl reload nginx
```

Verify after deployment:

```bash
curl -fsS http://10.10.10.122/api/health
curl -I http://10.10.10.122/
curl -I http://10.10.10.122/projects/example
```

The configured private-IP deployment intentionally uses host-only,
`SameSite=Lax`, non-Secure cookies because it is plain HTTP. When TLS is added,
set `COOKIE_SECURE=true`; keep `SameSite=Lax` for this same-origin topology.
