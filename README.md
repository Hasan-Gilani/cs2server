# CS2 Dedicated Server

Scripts to install and run a Counter-Strike 2 dedicated server on Linux.

## Requirements

- Linux (Ubuntu 20.04+ or Debian 11+ recommended)
- 4 GB RAM minimum (8 GB recommended)
- ~30 GB disk space for CS2
- A **Game Server Login Token (GSLT)** for internet-visible servers
  - Get one at: https://steamcommunity.com/dev/managegameservers (App ID 730)

---

## Quick Start

### 1. Copy this project to your server

```bash
scp -r ./cs2server user@your-server-ip:~/cs2server
# or clone your git repo on the server
```

### 2. Configure

```bash
cd ~/cs2server
cp .env.example .env
nano .env        # fill in RCON_PASSWORD, STEAM_ACCOUNT, etc.
```

### 3. Install (run once)

```bash
chmod +x install.sh
./install.sh
```

This will:
- Install system dependencies (lib32gcc, wget, screen, etc.)
- Download SteamCMD to `~/steamcmd`
- Download CS2 (~25 GB) to `~/cs2`
- Copy `cfg/server.cfg` and `cfg/autoexec.cfg` into the CS2 install

### 4. Start the server

```bash
./start.sh
```

To run in the background using `screen`:
```bash
# In .env, set: USE_SCREEN=true
./start.sh

# Detach from screen: Ctrl+A then D
# Re-attach:
screen -r cs2server
```

---

## Updating CS2

```bash
./update.sh
```

---

## File Structure

```
cs2server/
├── install.sh          # One-time installer (SteamCMD + CS2)
├── update.sh           # Update CS2 to latest version
├── start.sh            # Launch the server
├── .env.example        # Configuration template
├── .env                # Your config (not committed to git)
└── cfg/
    ├── server.cfg      # Server settings (copied to CS2 on install)
    └── autoexec.cfg    # Auto-executed on map load
```

---

## Port Forwarding

Open these ports on your firewall/router:

| Port  | Protocol | Purpose         |
|-------|----------|-----------------|
| 27015 | UDP+TCP  | Game / RCON     |
| 27020 | UDP      | SourceTV        |
| 27005 | UDP      | Client port     |

On Linux with `ufw`:
```bash
sudo ufw allow 27015/udp
sudo ufw allow 27015/tcp
sudo ufw allow 27020/udp
```

---

## Game Mode Reference

| GAME_TYPE | GAME_MODE | Mode             |
|-----------|-----------|------------------|
| 0         | 0         | Casual           |
| 0         | 1         | Competitive      |
| 0         | 2         | Wingman          |
| 1         | 0         | Arms Race        |
| 1         | 1         | Demolition       |
| 1         | 2         | Deathmatch       |

---

## RCON

Connect with any RCON client (e.g. `rcon_address`, `rcon_password` in game console):

```
rcon_address  <server-ip>:27015
rcon_password <your-rcon-password>
rcon map de_mirage
```
