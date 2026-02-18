# CS2 Dedicated Server

Scripts to install and run a Counter-Strike 2 dedicated server on Linux, with a full mod stack.

## Requirements

- Linux (Ubuntu 22.04+ recommended)
- 2 vCPU, 8 GB RAM (t3.large or equivalent)
- ~100 GB disk space (CS2 is ~62 GB)
- A **Game Server Login Token (GSLT)** for internet-visible servers
  - Get one at: https://steamcommunity.com/dev/managegameservers (App ID 730)

---

## Quick Start

### 1. Copy this project to your server

```bash
scp -r ./cs2server user@your-server-ip:~/
# or clone your git repo on the server
git clone git@github.com:Hasan-Gilani/cs2server.git ~/
```

### 2. Configure

```bash
cp .env.example .env
nano .env        # fill in RCON_PASSWORD, STEAM_ACCOUNT, SERVER_PASSWORD, etc.
```

### 3. Install CS2 (run once, ~62 GB download)

```bash
chmod +x install.sh
bash install.sh
```

### 4. Install mods (run once after install.sh)

```bash
chmod +x mods_install.sh
bash mods_install.sh
```

Then set up MySQL and write plugin configs:

```bash
chmod +x db_setup.sh
bash db_setup.sh
```

### 5. Start the server

```bash
bash start.sh
```

The server runs inside a `screen` session by default.

```bash
# Re-attach to the server console:
screen -r cs2server

# Detach without stopping: Ctrl+A then D
```

---

## Updating CS2

```bash
bash update.sh
```

> `start.sh` automatically restores `gameinfo.gi` on every launch, so Metamod survives CS2 updates.
> After a CS2 update you may also need to re-run `mods_install.sh` if plugin APIs change.

---

## File Structure

```
cs2server/
├── install.sh          # One-time installer (SteamCMD + CS2)
├── mods_install.sh     # Install Metamod, CSS, and all plugins
├── db_setup.sh         # Install MySQL and write plugin database configs
├── update.sh           # Update CS2 to latest version
├── start.sh            # Launch the server (screen by default)
├── gameinfo.gi         # Patched CS2 engine config — adds Metamod to search paths
├── .env.example        # Configuration template
├── .env                # Your config (not committed to git)
└── cfg/
    ├── server.cfg      # Server settings (copied to CS2 on install)
    └── autoexec.cfg    # Auto-executed on map load
```

---

## Mod Stack

| Plugin | Version | Purpose | Repo |
|--------|---------|---------|------|
| [Metamod:Source](https://www.sourcemm.net/) | latest 2.0 build | Plugin framework (required by CSS) | https://github.com/alliedmodders/metamod-source |
| [CounterStrikeSharp](https://github.com/roflmuffin/CounterStrikeSharp) | v1.0.362 | .NET plugin host for CS2 | https://github.com/roflmuffin/CounterStrikeSharp |
| [MatchZy](https://github.com/shobhit-pathak/MatchZy) | 0.8.15 | Competitive match management | https://github.com/shobhit-pathak/MatchZy |
| [WeaponPaints](https://github.com/Nereziel/cs2-WeaponPaints) | build-411 | Skin / paint customisation | https://github.com/Nereziel/cs2-WeaponPaints |
| [CS2-SimpleAdmin](https://github.com/daffyyyy/CS2-SimpleAdmin) | build-1.7.8-beta-10b1 | Admin commands and ban management | https://github.com/daffyyyy/CS2-SimpleAdmin |
| [AnyBaseLib](https://github.com/NickFox007/AnyBaseLibCS2) | 0.9.4 | Shared library (required by MenuManager & PlayerSettings) | https://github.com/NickFox007/AnyBaseLibCS2 |
| [MenuManager](https://github.com/NickFox007/MenuManagerCS2) | 1.4.1 | In-game menu system | https://github.com/NickFox007/MenuManagerCS2 |
| [PlayerSettings](https://github.com/NickFox007/PlayerSettingsCS2) | 0.9.3 | Per-player persistent settings | https://github.com/NickFox007/PlayerSettingsCS2 |

### Plugin install notes

- **CS2-SimpleAdmin** zip uses `counterstrikesharp/` paths — extracted to `addons/` so paths resolve correctly.
- **StatusBlocker** (bundled with CS2-SimpleAdmin) zip has a versioned wrapper folder that is stripped before install.
- **WeaponPaints** requires its `weaponpaints.json` gamedata file copied into CSS's `gamedata/` directory.
- **CounterStrikeSharp** is upgraded to v1.0.362 standalone after MatchZy installs its older bundled version.

---

## Port Forwarding

Open these ports on your firewall / security group:

| Port  | Protocol | Purpose         |
|-------|----------|-----------------|
| 27015 | UDP+TCP  | Game / RCON     |
| 27020 | UDP      | SourceTV        |
| 27005 | UDP      | Client port     |

---

## Game Mode Reference

| GAME_TYPE | GAME_MODE | Mode        |
|-----------|-----------|-------------|
| 0         | 0         | Casual      |
| 0         | 1         | Competitive |
| 0         | 2         | Wingman     |
| 1         | 0         | Arms Race   |
| 1         | 1         | Demolition  |
| 1         | 2         | Deathmatch  |

---

## RCON

Connect with any RCON client (e.g. in the CS2 console):

```
rcon_address  <server-ip>:27015
rcon_password <your-rcon-password>
rcon map de_mirage
```
