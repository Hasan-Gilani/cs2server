# Claude Operational Instructions

See [project.md](project.md) for all infrastructure details, file paths, architecture, and design notes.

## SSH

**Always use PowerShell ssh — Git Bash ssh silently fails (exit 255).**

```bash
powershell.exe -Command "Write-Host (ssh -i 'C:\Users\Gilani\cs2server\cs2key.pem' -o StrictHostKeyChecking=no ubuntu@16.24.36.253 'COMMAND')"
```

SCP a file to the server:
```bash
powershell.exe -Command "Write-Host (scp -i 'C:\Users\Gilani\cs2server\cs2key.pem' -o StrictHostKeyChecking=no 'C:\local\file' ubuntu@16.24.36.253:/remote/path 2>&1)"
```

SCP a directory:
```bash
powershell.exe -Command "Write-Host (scp -i 'C:\Users\Gilani\cs2server\cs2key.pem' -o StrictHostKeyChecking=no -r 'C:\local\dir' ubuntu@16.24.36.253:/remote/path 2>&1)"
```

**Never use `$var =` assignments inside `powershell.exe -Command "..."` from bash — bash eats the `$`.**

## Deploying the Backend (Flask app)

Run from the repo root. Packs `website/`, uploads, extracts to `/var/www/cs2-skins/`, installs pip deps, restarts the service:

```bash
bash deploy_website.sh
```

> If that script fails on Windows (SSH/SCP issue), do it manually:
> 1. `tar -czf /tmp/cs2-skins.tar.gz -C . website/`
> 2. SCP `/tmp/cs2-skins.tar.gz` → `ubuntu@16.24.36.253:~/`
> 3. SSH: `sudo tar -xzf ~/cs2-skins.tar.gz -C /var/www/cs2-skins --strip-components=1 website/ && sudo chown -R www-data:www-data /var/www/cs2-skins && sudo systemctl restart cs2-skins`

After backend changes, always restart the service:
```bash
powershell.exe -Command "Write-Host (ssh -i 'C:\Users\Gilani\cs2server\cs2key.pem' -o StrictHostKeyChecking=no ubuntu@16.24.36.253 'sudo systemctl restart cs2-skins && sudo systemctl is-active cs2-skins')"
```

## Deploying the Frontend (React/Vite)

**Step 1 — Build locally:**
```bash
cd website/frontend && npm run build
```

**Step 2 — Upload dist to home directory (not directly to /var/www — permission denied):**
```bash
powershell.exe -Command "Write-Host (scp -i 'C:\Users\Gilani\cs2server\cs2key.pem' -o StrictHostKeyChecking=no -r 'C:\Users\Gilani\cs2server\website\frontend\dist' ubuntu@16.24.36.253:~/frontend_dist_new 2>&1)"
```

**Step 3 — Move into place on the server:**
```bash
powershell.exe -Command "Write-Host (ssh -i 'C:\Users\Gilani\cs2server\cs2key.pem' -o StrictHostKeyChecking=no ubuntu@16.24.36.253 'sudo rm -rf /var/www/cs2-skins/frontend/dist && sudo mv ~/frontend_dist_new /var/www/cs2-skins/frontend/dist && sudo chown -R www-data:www-data /var/www/cs2-skins/frontend/dist && echo done')"
```

nginx serves from `/var/www/cs2-skins/frontend/dist` — **do not deploy to `/var/www/cs2-skins/static/`** (legacy, unused).

## Service Management

```bash
# Check status of all relevant services
powershell.exe -Command "Write-Host (ssh -i 'C:\Users\Gilani\cs2server\cs2key.pem' -o StrictHostKeyChecking=no ubuntu@16.24.36.253 'sudo systemctl status cs2-skins nginx cs2server --no-pager -l')"

# Restart backend only
... 'sudo systemctl restart cs2-skins'

# Reload nginx (config change)
... 'sudo nginx -t && sudo systemctl reload nginx'

# View backend logs (last 50 lines)
... 'sudo tail -50 /var/log/cs2-skins/error.log'
... 'sudo tail -50 /var/log/cs2-skins/access.log'

# View backend live logs
... 'sudo journalctl -u cs2-skins -f --no-pager'
```

## Updating nginx Config

```bash
# 1. Edit nginx-cs2-skins.conf locally, then:
powershell.exe -Command "Write-Host (scp -i 'C:\Users\Gilani\cs2server\cs2key.pem' -o StrictHostKeyChecking=no 'C:\Users\Gilani\cs2server\nginx-cs2-skins.conf' ubuntu@16.24.36.253:/tmp/nginx-cs2-skins.conf 2>&1)"
powershell.exe -Command "Write-Host (ssh -i 'C:\Users\Gilani\cs2server\cs2key.pem' -o StrictHostKeyChecking=no ubuntu@16.24.36.253 'sudo cp /tmp/nginx-cs2-skins.conf /etc/nginx/sites-available/cs2-skins && sudo nginx -t && sudo systemctl reload nginx && echo done')"
```

## Updating the systemd Service Unit

```bash
powershell.exe -Command "Write-Host (scp -i 'C:\Users\Gilani\cs2server\cs2key.pem' -o StrictHostKeyChecking=no 'C:\Users\Gilani\cs2server\cs2-skins.service' ubuntu@16.24.36.253:/tmp/cs2-skins.service 2>&1)"
powershell.exe -Command "Write-Host (ssh -i 'C:\Users\Gilani\cs2server\cs2key.pem' -o StrictHostKeyChecking=no ubuntu@16.24.36.253 'sudo cp /tmp/cs2-skins.service /etc/systemd/system/cs2-skins.service && sudo systemctl daemon-reload && sudo systemctl restart cs2-skins && echo done')"
```

## Security Rules

- Never commit `cs2key.pem` or `.env` — both are in `.gitignore`
- `.env` lives only at `/var/www/cs2-skins/.env` on the server
- Use `.env.example` for the template (placeholder values only)
- `cs2key.pem` must have Windows ACL: only Gilani with Read — no SYSTEM, no Administrators
  ```
  icacls cs2key.pem /inheritance:r
  icacls cs2key.pem /remove SYSTEM Administrators
  icacls cs2key.pem /grant:r "Gilani:(R)"
  ```

## AWS CLI (Git Bash)

Prefix ARN/path args with `MSYS_NO_PATHCONV=1` to prevent Git Bash path mangling:
```bash
MSYS_NO_PATHCONV=1 aws --profile cs2server --region me-south-1 <command>
```

## Common Pitfalls

- **Frontend not updating after deploy**: check you deployed to `frontend/dist`, not `static/`
- **Backend changes not taking effect**: restart `cs2-skins` service after any Python file change
- **nginx 502**: check `cs2-skins` is running and gunicorn socket exists at `/run/cs2-skins/gunicorn.sock`
- **Skin catalog stale**: restart `cs2-skins` to clear in-memory cache (TTL 1h)
- **Agents not applying in-game**: model ID must be `model_player` with `characters/models/` and `.vmdl` stripped (e.g. `ctm_st6/ctm_st6_variantl`) — `original.name` does NOT work
- **Admin flags lost on restart**: CS2-SimpleAdmin reads `sa_admins_flags` table, not `sa_admins.flags` text column
