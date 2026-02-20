# CS2 Server Project Reference

## Infrastructure

| Item | Value |
|------|-------|
| Provider | AWS EC2, me-south-1 (Bahrain) |
| Instance ID | `i-0c39fcc94c2604baf` |
| Type | t3.large |
| OS | Ubuntu 24.04 LTS |
| Public IP | **16.24.36.253** (Elastic IP — static) |
| SSH user | `ubuntu` |
| SSH key | `cs2key.pem` (repo root, Gilani read-only ACL) |
| Security Group | `sg-0e8eab50e758fa8b9` — ports 22, 27015 TCP/UDP, 27020 UDP |
| AWS profile | `cs2server`, region `me-south-1` |

## Running Services

| Service | Description | Managed by |
|---------|-------------|------------|
| `nginx` | Reverse proxy + static frontend | systemd |
| `cs2-skins` | Flask/Gunicorn backend API | systemd |
| `cs2server` | CS2 dedicated game server | systemd |
| `cs2-redirect` | Steam:// connect redirect helper | systemd |
| `mysql` | MariaDB/MySQL database | systemd |

## Architecture

```
Browser
  │
  ▼
nginx :80  (/var/www/cs2-skins/frontend/dist — React SPA)
  │
  ├── /assets/*          → static files (1yr cache)
  ├── /api/* /auth/* /health/* → proxy → gunicorn.sock
  └── /* (SPA)           → index.html

gunicorn.sock  (/run/cs2-skins/gunicorn.sock)
  │
  ▼
Gunicorn (4 workers, sync, user=www-data)
  │  WorkingDir: /var/www/cs2-skins
  │  venv:       /var/www/cs2-skins/venv
  │  wsgi entry: wsgi.py → app/
  │
  ├── /auth/*   → Steam OpenID 2.0 login/logout/me
  ├── /api/catalog/*   → bymykel skin catalog (1h in-memory cache)
  └── /api/player/*    → player skin selections (MySQL)

MySQL (127.0.0.1:3306, db=cs2server, user=cs2admin)
  ├── wp_player_skins    (steamid, weapon_team, weapon_defindex, weapon_paint_id, wear, seed, nametag, stattrak)
  ├── wp_player_knife    (steamid, weapon_team, knife)
  ├── wp_player_gloves   (steamid, weapon_team, weapon_defindex)
  └── wp_player_agents   (steamid, agent_ct, agent_t)

CS2 Server (game, separate from website)
  Port: 27015 TCP/UDP   Password: tbs5v5cs2
  Installed: /home/ubuntu/Steam/steamapps/...
  Mods: Metamod, CounterStrikeSharp, WeaponPaints, CS2-SimpleAdmin
```

## Server File Layout

```
/var/www/cs2-skins/           ← app root (owned by www-data)
├── .env                      ← secrets (SECRET_KEY, DB_PASS, STEAM_API_KEY, etc.)
├── wsgi.py                   ← Gunicorn entry point
├── config.py                 ← Config class (reads .env)
├── requirements.txt          ← Python deps (Flask, gunicorn, PyMySQL, etc.)
├── venv/                     ← Python virtualenv
├── app/
│   ├── __init__.py           ← Flask app factory, blueprints, error handlers
│   ├── db.py                 ← Per-request PyMySQL connection
│   ├── auth.py               ← Steam OpenID blueprint (/auth/*)
│   ├── cache.py              ← In-memory bymykel catalog cache
│   └── api/
│       ├── __init__.py       ← api_bp, registers catalog_bp + player_bp
│       ├── catalog.py        ← /api/catalog/* (skins, knives, gloves, agents)
│       └── player.py         ← /api/player/* (profile, skins, knife, gloves, agents)
├── frontend/
│   ├── dist/                 ← Built React app (served by nginx)
│   │   ├── index.html
│   │   └── assets/           ← Vite content-hashed JS/CSS
│   └── src/                  ← React source (on server for reference only)
├── static/                   ← Legacy static dir (unused, ignore)
├── templates/                ← Legacy templates dir (unused, nginx serves dist/)
/var/log/cs2-skins/
├── access.log
└── error.log
/etc/nginx/sites-available/cs2-skins   ← nginx config
/etc/nginx/sites-enabled/cs2-skins     ← symlink to above
```

## Local Project Layout

```
cs2server/                    ← repo root
├── CLAUDE.md                 ← Claude operational instructions
├── project.md                ← this file
├── cs2key.pem                ← SSH key (never commit)
├── .env.example              ← env template (no real values)
├── deploy_website.sh         ← full backend deploy script
├── nginx-cs2-skins.conf      ← nginx config source
├── cs2-skins.service         ← systemd unit source
├── website/                  ← Flask backend + React frontend source
│   ├── config.py
│   ├── wsgi.py
│   ├── requirements.txt
│   ├── app/                  ← Flask app
│   └── frontend/             ← React/Vite/Tailwind app
│       ├── src/
│       │   ├── pages/        ← WeaponsPage, KnifePage, GlovesPage, AgentsPage, LoginPage
│       │   ├── components/   ← NavBar, SkinCard, SkinConfigModal, RarityFilter
│       │   ├── hooks/        ← useAuth, useToast
│       │   ├── api/client.js ← all API calls
│       │   └── lib/weapons.js← WEAPON_TEAMS side map
│       └── dist/             ← built output (gitignored)
├── cfg/server.cfg            ← CS2 server config
├── install.sh / start.sh / update.sh / mods_install.sh
└── discord_notify.sh / discord-notify.service
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Python 3, Flask, Gunicorn (4 workers) |
| Database | MySQL, PyMySQL (DictCursor) |
| Web server | nginx (reverse proxy + static) |
| Auth | Steam OpenID 2.0, Flask sessions |
| Skin data | bymykel CSGO-API (fetched + cached 1h) |

## Environment Variables (.env on server)

```
SECRET_KEY=<random hex>
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=cs2server
DB_USER=cs2admin
DB_PASS=<password>
STEAM_API_KEY=<key>
BASE_URL=http://16.24.36.253
SKIN_CACHE_TTL=3600
SESSION_COOKIE_SECURE=false
SESSION_LIFETIME=86400
```

## Key Design Notes

- **team values**: 0=both (expanded to 2+3), 2=Terrorist, 3=CounterTerrorist
- **WeaponPaints agent model ID**: strip `characters/models/` and `.vmdl` from `model_player` field (e.g. `ctm_st6/ctm_st6_variantl`)
- **Rarity color**: use `skin.rarity.color` hex directly from bymykel — no mapping needed
- **Defindex**: use `weapon.weapon_id` from bymykel directly as defindex — preferred over manual map
- **Glove defindex**: stored in `wp_player_gloves`; paint goes into `wp_player_skins` like a regular weapon
- **Admin flags**: CS2-SimpleAdmin reads from `sa_admins_flags` table (one row per flag), NOT `sa_admins.flags` text column (legacy)
- **skin catalog cache**: server-side in-memory, TTL 1h. Restart cs2-skins service to clear.
- **nginx serves**: `/var/www/cs2-skins/frontend/dist` — deploy built output here, not `/static/`

## CS2 Game Server

- Port: `27015` (TCP+UDP), RCON/SourceTV: `27020` UDP
- Password: `tbs5v5cs2`
- Steam connect: `steam://connect/16.24.36.253:27015/tbs5v5cs2`
- Service: `cs2server.service`
- Mods: Metamod, CounterStrikeSharp, WeaponPaints, CS2-SimpleAdmin
