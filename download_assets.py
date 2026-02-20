#!/usr/bin/env python3
"""
Download all CS2 weapon models, skin textures (color + metalness), and HDR environment.
Run on the server: python3 ~/download_assets.py
Fully resumable — skips existing files.
"""
import os, sys, time, json
from concurrent.futures import ThreadPoolExecutor, as_completed

# Use the venv's requests
sys.path.insert(0, '/var/www/cs2-skins/venv/lib/python3.12/site-packages')
import requests

BYMYKEL   = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en'
LIELXD    = 'https://raw.githubusercontent.com/LielXD/CS2-WeaponPaints-Website/refs/heads/main/src'
TEX_BASE  = f'{LIELXD}/%5Btextures%5D'
MDL_BASE  = f'{LIELXD}/%5Bmodels%5D'

MODELS_DIR   = '/var/www/cs2-skins/models'
TEXTURES_DIR = '/var/www/cs2-skins/textures'

WEAPON_MODELS = [
    'weapon_ak47', 'weapon_aug', 'weapon_awp', 'weapon_bizon', 'weapon_cz75a',
    'weapon_deagle', 'weapon_elite', 'weapon_famas', 'weapon_fiveseven', 'weapon_g3sg1',
    'weapon_galilar', 'weapon_glock', 'weapon_hkp2000', 'weapon_m249', 'weapon_m4a1',
    'weapon_m4a1_silencer', 'weapon_mac10', 'weapon_mag7', 'weapon_mp5sd', 'weapon_mp7',
    'weapon_mp9', 'weapon_negev', 'weapon_nova', 'weapon_p250', 'weapon_p90',
    'weapon_revolver', 'weapon_sawedoff', 'weapon_scar20', 'weapon_sg556', 'weapon_ssg08',
    'weapon_tec9', 'weapon_ump45', 'weapon_usp_silencer', 'weapon_xm1014',
    # Knives
    'weapon_knife_bayonet', 'weapon_knife_butterfly', 'weapon_knife_canis',
    'weapon_knife_cord', 'weapon_knife_css', 'weapon_knife_falchion', 'weapon_knife_flip',
    'weapon_knife_gut', 'weapon_knife_gypsy_jackknife', 'weapon_knife_karambit',
    'weapon_knife_m9_bayonet', 'weapon_knife_outdoor', 'weapon_knife_push',
    'weapon_knife_skeleton', 'weapon_knife_stiletto', 'weapon_knife_survival_bowie',
    'weapon_knife_tactical', 'weapon_knife_ursus', 'weapon_knife_widowmaker',
]

sess = requests.Session()
sess.headers['User-Agent'] = 'CS2SkinServer/1.0'

def dl(url, dest, label=''):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return 'skip'
    try:
        r = sess.get(url, timeout=30)
        if r.status_code == 404:
            return 'miss'
        r.raise_for_status()
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, 'wb') as f:
            f.write(r.content)
        return 'ok'
    except Exception as e:
        return f'err:{e}'


# ── 1. Models ────────────────────────────────────────────────────────────────

print(f'\n=== Models ({len(WEAPON_MODELS)} weapons) ===')
os.makedirs(MODELS_DIR, exist_ok=True)
ok = skip = miss = 0
for w in WEAPON_MODELS:
    url  = f'{MDL_BASE}/{w}.glb'
    dest = f'{MODELS_DIR}/{w}.glb'
    r = dl(url, dest)
    if r == 'ok':   ok   += 1; print(f'  ✓ {w}')
    elif r == 'skip': skip += 1
    else:           miss += 1; print(f'  ✗ {w} ({r})')
print(f'  Models: {ok} downloaded, {skip} skipped, {miss} missing')


# ── 2. HDR environment ───────────────────────────────────────────────────────

print('\n=== Environment HDR ===')
r = dl(f'{LIELXD}/environment.hdr', f'{MODELS_DIR}/environment.hdr')
print(f'  environment.hdr: {r}')


# ── 3. Skin textures ─────────────────────────────────────────────────────────

print('\n=== Skin catalog (fetching from bymykel) ===')
skins_data = sess.get(f'{BYMYKEL}/skins.json', timeout=60).json()
print(f'  {len(skins_data)} skin entries loaded')

# Build list of (weapon_id, paint_index) pairs to download
tasks = []
for skin in skins_data:
    wid = (skin.get('weapon') or {}).get('id', '')
    pid = skin.get('paint_index', '')
    if not wid or not pid:
        continue
    tasks.append((wid, str(pid)))

print(f'  {len(tasks)} textures to download (resumable)')

ok = skip = miss = err = 0
t0 = time.time()

def fetch_texture(args):
    wid, pid = args
    dest = f'{TEXTURES_DIR}/{wid}/{pid}.png'
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return 'skip'
    url = f'{TEX_BASE}/{wid}/{pid}.png'
    r = sess.get(url, timeout=20)
    if r.status_code == 200 and len(r.content) > 500:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, 'wb') as f:
            f.write(r.content)
        return 'ok'
    # Try webp
    url_webp = f'{TEX_BASE}/{wid}/{pid}.webp'
    r2 = sess.get(url_webp, timeout=20)
    if r2.status_code == 200 and len(r2.content) > 500:
        dest_webp = dest.replace('.png', '.webp')
        os.makedirs(os.path.dirname(dest_webp), exist_ok=True)
        with open(dest_webp, 'wb') as f:
            f.write(r2.content)
        return 'ok'
    return 'miss'

done = 0
with ThreadPoolExecutor(max_workers=6) as pool:
    futs = {pool.submit(fetch_texture, t): t for t in tasks}
    for fut in as_completed(futs):
        done += 1
        result = fut.result()
        if result == 'ok':    ok   += 1
        elif result == 'skip': skip += 1
        elif result == 'miss': miss += 1
        else:                  err  += 1
        if done % 100 == 0 or done == len(tasks):
            elapsed = time.time() - t0
            rate = done / elapsed if elapsed > 0 else 0
            eta = (len(tasks) - done) / rate if rate > 0 else 0
            print(f'  [{done}/{len(tasks)}] ok={ok} skip={skip} miss={miss} err={err} '
                  f'({rate:.1f}/s, ETA {eta/60:.1f}m)')


# ── 4. Metalness textures ─────────────────────────────────────────────────────

print('\n=== Metalness textures ({paintId}_metal.png) ===')
print(f'  {len(tasks)} metalness textures to check')

ok = skip = miss = err = 0
t0 = time.time()

def fetch_metal(args):
    wid, pid = args
    dest = f'{TEXTURES_DIR}/{wid}/{pid}_metal.png'
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return 'skip'
    dest_webp = f'{TEXTURES_DIR}/{wid}/{pid}_metal.webp'
    if os.path.exists(dest_webp) and os.path.getsize(dest_webp) > 0:
        return 'skip'
    # Try PNG first
    url = f'{TEX_BASE}/{wid}/{pid}_metal.png'
    r = sess.get(url, timeout=20)
    if r.status_code == 200 and len(r.content) > 500:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, 'wb') as f:
            f.write(r.content)
        return 'ok'
    # Try WebP
    url_webp = f'{TEX_BASE}/{wid}/{pid}_metal.webp'
    r2 = sess.get(url_webp, timeout=20)
    if r2.status_code == 200 and len(r2.content) > 500:
        os.makedirs(os.path.dirname(dest_webp), exist_ok=True)
        with open(dest_webp, 'wb') as f:
            f.write(r2.content)
        return 'ok'
    return 'miss'

done = 0
with ThreadPoolExecutor(max_workers=6) as pool:
    futs = {pool.submit(fetch_metal, t): t for t in tasks}
    for fut in as_completed(futs):
        done += 1
        result = fut.result()
        if result == 'ok':     ok   += 1
        elif result == 'skip': skip += 1
        elif result == 'miss': miss += 1
        else:                  err  += 1
        if done % 100 == 0 or done == len(tasks):
            elapsed = time.time() - t0
            rate = done / elapsed if elapsed > 0 else 0
            eta = (len(tasks) - done) / rate if rate > 0 else 0
            print(f'  [{done}/{len(tasks)}] ok={ok} skip={skip} miss={miss} err={err} '
                  f'({rate:.1f}/s, ETA {eta/60:.1f}m)')


# ── Done ──────────────────────────────────────────────────────────────────────

print('\n=== Setting permissions ===')
os.system(f'sudo chown -R www-data:www-data {MODELS_DIR} {TEXTURES_DIR}')

total_mb = sum(
    os.path.getsize(os.path.join(dp, f))
    for d in [MODELS_DIR, TEXTURES_DIR]
    for dp, _, fs in os.walk(d) for f in fs
) / 1024 / 1024

print(f'\nDone! Total on disk: {total_mb:.0f} MB')
print(f'Models:   {MODELS_DIR}')
print(f'Textures: {TEXTURES_DIR}')
