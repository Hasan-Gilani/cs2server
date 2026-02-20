#!/usr/bin/env python3
"""
Download metalness textures (_metal.png / _metal.webp) for all CS2 skins.
Run on the server: python3 ~/download_metal_textures.py
Fully resumable — skips existing files.
"""
import os, sys, time, json
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, '/var/www/cs2-skins/venv/lib/python3.12/site-packages')
import requests

BYMYKEL = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en'
LIELXD = 'https://raw.githubusercontent.com/LielXD/CS2-WeaponPaints-Website/refs/heads/main/src'
TEX_BASE = f'{LIELXD}/%5Btextures%5D'
TEXTURES_DIR = '/var/www/cs2-skins/textures'

sess = requests.Session()
sess.headers['User-Agent'] = 'CS2SkinServer/1.0'

print('=== Fetching skin catalog ===')
skins_data = sess.get(f'{BYMYKEL}/skins.json', timeout=60).json()
print(f'  {len(skins_data)} skin entries loaded')

tasks = []
for skin in skins_data:
    wid = (skin.get('weapon') or {}).get('id', '')
    pid = skin.get('paint_index', '')
    if not wid or not pid:
        continue
    tasks.append((wid, str(pid)))

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

os.system(f'sudo chown -R www-data:www-data {TEXTURES_DIR}')
print(f'\nDone! ok={ok} skip={skip} miss={miss} err={err}')
