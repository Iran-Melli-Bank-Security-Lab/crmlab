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

After installing Node.js, MongoDB, Nginx, and PM2, place the project directly in
the `slb` user's home directory at `/home/slb` and run the automated setup as
that user:

```bash
cd /home/slb
./deploy/setup-server.sh
```

The script runs `npm ci`, creates `apps/api/.env` when absent, generates four
independent 64-character secrets, prepares persistent uploads, builds both apps,
starts or reloads PM2, installs the Nginx symlink, validates Nginx, reloads it,
and checks the API health endpoint. Existing non-placeholder secrets are never
overwritten. It grants the Nginx worker traversal permission on `/home/slb` and
read-only access to `/home/slb/dist/web-fsa`; it does not make other home files
world-readable.

The production template uses the existing local MongoDB database named `test`:

```text
MONGO_URI=mongodb://127.0.0.1:27017/test
```

If the server uses a different MongoDB URI, copy
`apps/api/.env.production.example` to `apps/api/.env` and update `MONGO_URI`
before running the script. The script will preserve that file and fill only its
secret placeholders. `apps/api/.env` remains on the server and is gitignored.

Verify after deployment:

```bash
curl -fsS http://10.10.10.122/api/health
curl -I http://10.10.10.122/
curl -I http://10.10.10.122/projects/example
```

The configured private-IP deployment intentionally uses host-only,
`SameSite=Lax`, non-Secure cookies because it is plain HTTP. When TLS is added,
set `COOKIE_SECURE=true`; keep `SameSite=Lax` for this same-origin topology.
