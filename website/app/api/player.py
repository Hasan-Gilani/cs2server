"""Player skin selection endpoints.

All routes require an active Steam session.

DB tables:
  wp_player_skins  (steamid, weapon_team, weapon_defindex, weapon_paint_id,
                    weapon_wear, weapon_seed, weapon_nametag, weapon_stattrak,
                    weapon_stattrak_count, weapon_sticker_0..4, weapon_keychain)
  wp_player_knife  (steamid, weapon_team, knife)
  wp_player_gloves (steamid, weapon_team, weapon_defindex)
  wp_player_agents (steamid, agent_ct, agent_t)
"""
import logging
from functools import wraps
from typing import Callable

from flask import Blueprint, jsonify, request, session
from ..db import get_db

logger = logging.getLogger(__name__)
player_bp = Blueprint('player', __name__)

# Valid team values — CS2 CsTeam enum: 0=both, 2=Terrorist, 3=CounterTerrorist
_VALID_TEAMS = {0, 2, 3}


# ── Auth guard ────────────────────────────────────────────────────────────────

def require_auth(f: Callable) -> Callable:
    @wraps(f)
    def wrapper(*args, **kwargs):
        if 'steamid' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return wrapper


# ── Helpers ───────────────────────────────────────────────────────────────────

def _steamid() -> str:
    return session['steamid']


def _json_body() -> tuple[dict | None, object]:
    """Return (data, error_response). data is None when body is invalid."""
    data = request.get_json(silent=True)
    if data is None:
        return None, (jsonify({'error': 'Request body must be JSON'}), 400)
    return data, None


def _require_fields(data: dict, *fields: str) -> object | None:
    missing = [f for f in fields if f not in data]
    if missing:
        return jsonify({'error': f'Missing fields: {", ".join(missing)}'}), 400
    return None


def _fmt_sticker(sticker_data) -> str:
    """Format sticker for DB as 'id;schema;x;y;wear;scale;rotation'.

    Accepts int kit_id or dict with 'id' key.
    Always stores default CS2 positions (0;0;0;0;1;0) — our 3D preview
    coordinates must NOT be saved here as the WeaponPaints plugin reads them.
    """
    if isinstance(sticker_data, dict):
        kit_id = int(sticker_data.get('id', 0) or 0)
    else:
        kit_id = int(sticker_data or 0)
    if kit_id:
        return f'{kit_id};0;0;0;0;1;0'
    return '0;0;0;0;0;0;0'


def _parse_sticker(val) -> int:
    """Parse a DB sticker string like '5;0;0;0;0;1;0' into a sticker kit ID int."""
    if not val:
        return 0
    try:
        return int(str(val).split(';')[0])
    except (ValueError, IndexError):
        return 0


def _process_skin_row(row: dict) -> dict:
    """Convert sticker string fields to integers for API consumers."""
    for i in range(5):
        key = f'weapon_sticker_{i}'
        if key in row:
            row[key] = _parse_sticker(row[key])
    return row


# ── Skins ─────────────────────────────────────────────────────────────────────

@player_bp.route('/skins', methods=['GET'])
@require_auth
def get_skins():
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            'SELECT * FROM wp_player_skins WHERE steamid = %s ORDER BY weapon_team, weapon_defindex',
            (_steamid(),),
        )
        rows = [_process_skin_row(r) for r in cur.fetchall()]
    return jsonify(rows)


@player_bp.route('/skins', methods=['PUT'])
@require_auth
def save_skin():
    data, err = _json_body()
    if err:
        return err
    err = _require_fields(data, 'weapon_defindex', 'weapon_team', 'weapon_paint_id')
    if err:
        return err

    try:
        weapon_defindex = int(data['weapon_defindex'])
        weapon_team = int(data['weapon_team'])
        weapon_paint_id = int(data['weapon_paint_id'])
        weapon_wear = float(data.get('weapon_wear', 0.000001))
        weapon_seed = int(data.get('weapon_seed', 0))
        weapon_nametag = str(data.get('weapon_nametag', ''))[:128]
        weapon_stattrak = int(bool(data.get('weapon_stattrak', False)))
        sticker_vals = []
        for i in range(5):
            raw = data.get(f'weapon_sticker_{i}', 0)
            if isinstance(raw, dict):
                sticker_vals.append(_fmt_sticker(raw))
            else:
                sticker_vals.append(_fmt_sticker(max(0, int(raw or 0))))

    except (ValueError, TypeError) as exc:
        return jsonify({'error': f'Invalid field value: {exc}'}), 400

    if weapon_team not in _VALID_TEAMS:
        return jsonify({'error': 'weapon_team must be 0, 2, or 3'}), 400
    if not (0.0 <= weapon_wear <= 1.0):
        return jsonify({'error': 'weapon_wear must be between 0.0 and 1.0'}), 400
    if not (0 <= weapon_seed <= 1000):
        return jsonify({'error': 'weapon_seed must be between 0 and 1000'}), 400

    # team=0 means "Both" — expand to T (2) and CT (3) as separate rows
    teams_to_save = [2, 3] if weapon_team == 0 else [weapon_team]

    db = get_db()
    with db.cursor() as cur:
        # Clean up legacy entries (team=0 stored as single row, team=1 old wrong-T)
        cur.execute(
            'DELETE FROM wp_player_skins WHERE steamid = %s AND weapon_defindex = %s AND weapon_team IN (0, 1)',
            (_steamid(), weapon_defindex),
        )
        for t in teams_to_save:
            cur.execute(
                '''
                INSERT INTO wp_player_skins
                    (steamid, weapon_team, weapon_defindex, weapon_paint_id,
                     weapon_wear, weapon_seed, weapon_nametag, weapon_stattrak,
                     weapon_sticker_0, weapon_sticker_1, weapon_sticker_2,
                     weapon_sticker_3, weapon_sticker_4)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    weapon_paint_id   = VALUES(weapon_paint_id),
                    weapon_wear       = VALUES(weapon_wear),
                    weapon_seed       = VALUES(weapon_seed),
                    weapon_nametag    = VALUES(weapon_nametag),
                    weapon_stattrak   = VALUES(weapon_stattrak),
                    weapon_sticker_0  = VALUES(weapon_sticker_0),
                    weapon_sticker_1  = VALUES(weapon_sticker_1),
                    weapon_sticker_2  = VALUES(weapon_sticker_2),
                    weapon_sticker_3  = VALUES(weapon_sticker_3),
                    weapon_sticker_4  = VALUES(weapon_sticker_4)
                ''',
                (_steamid(), t, weapon_defindex, weapon_paint_id,
                 weapon_wear, weapon_seed, weapon_nametag, weapon_stattrak,
                 *sticker_vals),
            )
    db.commit()
    return jsonify({'status': 'ok'})


@player_bp.route('/skins', methods=['DELETE'])
@require_auth
def delete_skin():
    data, err = _json_body()
    if err:
        return err
    err = _require_fields(data, 'weapon_defindex', 'weapon_team')
    if err:
        return err

    try:
        weapon_defindex = int(data['weapon_defindex'])
        weapon_team = int(data['weapon_team'])
    except (ValueError, TypeError) as exc:
        return jsonify({'error': f'Invalid field value: {exc}'}), 400

    db = get_db()
    with db.cursor() as cur:
        if weapon_team == 0:
            # Remove all team entries for this weapon (full removal)
            cur.execute(
                'DELETE FROM wp_player_skins WHERE steamid = %s AND weapon_defindex = %s',
                (_steamid(), weapon_defindex),
            )
        else:
            cur.execute(
                'DELETE FROM wp_player_skins WHERE steamid = %s AND weapon_defindex = %s AND weapon_team = %s',
                (_steamid(), weapon_defindex, weapon_team),
            )
            # Also clean up legacy entries
            cur.execute(
                'DELETE FROM wp_player_skins WHERE steamid = %s AND weapon_defindex = %s AND weapon_team IN (0, 1)',
                (_steamid(), weapon_defindex),
            )
    db.commit()
    return jsonify({'status': 'ok'})


# ── Knife ─────────────────────────────────────────────────────────────────────

@player_bp.route('/knife', methods=['GET'])
@require_auth
def get_knife():
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            'SELECT weapon_team, knife FROM wp_player_knife WHERE steamid = %s',
            (_steamid(),),
        )
        rows = cur.fetchall()
    return jsonify(rows)


@player_bp.route('/knife', methods=['PUT'])
@require_auth
def save_knife():
    data, err = _json_body()
    if err:
        return err
    err = _require_fields(data, 'weapon_team', 'knife')
    if err:
        return err

    try:
        weapon_team = int(data['weapon_team'])
        knife = str(data['knife'])[:64]
    except (ValueError, TypeError) as exc:
        return jsonify({'error': f'Invalid field value: {exc}'}), 400

    if weapon_team not in _VALID_TEAMS:
        return jsonify({'error': 'weapon_team must be 0, 1, or 2'}), 400

    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            '''
            INSERT INTO wp_player_knife (steamid, weapon_team, knife)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE knife = VALUES(knife)
            ''',
            (_steamid(), weapon_team, knife),
        )
    db.commit()
    return jsonify({'status': 'ok'})


@player_bp.route('/knife', methods=['DELETE'])
@require_auth
def delete_knife():
    data, err = _json_body()
    if err:
        return err
    err = _require_fields(data, 'weapon_team')
    if err:
        return err

    try:
        weapon_team = int(data['weapon_team'])
    except (ValueError, TypeError) as exc:
        return jsonify({'error': f'Invalid field value: {exc}'}), 400

    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            'DELETE FROM wp_player_knife WHERE steamid = %s AND weapon_team = %s',
            (_steamid(), weapon_team),
        )
    db.commit()
    return jsonify({'status': 'ok'})


# ── Gloves ────────────────────────────────────────────────────────────────────

@player_bp.route('/gloves', methods=['GET'])
@require_auth
def get_gloves():
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            'SELECT weapon_team, weapon_defindex FROM wp_player_gloves WHERE steamid = %s',
            (_steamid(),),
        )
        rows = cur.fetchall()
    return jsonify(rows)


@player_bp.route('/gloves', methods=['PUT'])
@require_auth
def save_gloves():
    data, err = _json_body()
    if err:
        return err
    err = _require_fields(data, 'weapon_team', 'weapon_defindex')
    if err:
        return err

    try:
        weapon_team = int(data['weapon_team'])
        weapon_defindex = int(data['weapon_defindex'])
    except (ValueError, TypeError) as exc:
        return jsonify({'error': f'Invalid field value: {exc}'}), 400

    if weapon_team not in _VALID_TEAMS:
        return jsonify({'error': 'weapon_team must be 0, 1, or 2'}), 400

    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            '''
            INSERT INTO wp_player_gloves (steamid, weapon_team, weapon_defindex)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE weapon_defindex = VALUES(weapon_defindex)
            ''',
            (_steamid(), weapon_team, weapon_defindex),
        )
    db.commit()
    return jsonify({'status': 'ok'})


@player_bp.route('/gloves', methods=['DELETE'])
@require_auth
def delete_gloves():
    data, err = _json_body()
    if err:
        return err
    err = _require_fields(data, 'weapon_team')
    if err:
        return err

    try:
        weapon_team = int(data['weapon_team'])
    except (ValueError, TypeError) as exc:
        return jsonify({'error': f'Invalid field value: {exc}'}), 400

    db = get_db()
    with db.cursor() as cur:
        if weapon_team == 0:
            cur.execute('DELETE FROM wp_player_gloves WHERE steamid = %s', (_steamid(),))
        else:
            cur.execute(
                'DELETE FROM wp_player_gloves WHERE steamid = %s AND weapon_team = %s',
                (_steamid(), weapon_team),
            )
    db.commit()
    return jsonify({'status': 'ok'})


# ── Agents ────────────────────────────────────────────────────────────────────

@player_bp.route('/agents', methods=['GET'])
@require_auth
def get_agents():
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            'SELECT agent_ct, agent_t FROM wp_player_agents WHERE steamid = %s',
            (_steamid(),),
        )
        row = cur.fetchone()
    return jsonify(row or {'agent_ct': None, 'agent_t': None})


@player_bp.route('/agents', methods=['PUT'])
@require_auth
def save_agents():
    data, err = _json_body()
    if err:
        return err

    agent_ct = str(data.get('agent_ct', '') or '')[:64] or None
    agent_t = str(data.get('agent_t', '') or '')[:64] or None

    if agent_ct is None and agent_t is None:
        return jsonify({'error': 'Provide at least one of agent_ct or agent_t'}), 400

    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            '''
            INSERT INTO wp_player_agents (steamid, agent_ct, agent_t)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE
                agent_ct = COALESCE(VALUES(agent_ct), agent_ct),
                agent_t  = COALESCE(VALUES(agent_t),  agent_t)
            ''',
            (_steamid(), agent_ct, agent_t),
        )
    db.commit()
    return jsonify({'status': 'ok'})


@player_bp.route('/agents', methods=['DELETE'])
@require_auth
def delete_agents():
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            'DELETE FROM wp_player_agents WHERE steamid = %s',
            (_steamid(),),
        )
    db.commit()
    return jsonify({'status': 'ok'})


# ── Full profile (all selections in one request) ──────────────────────────────

@player_bp.route('/profile', methods=['GET'])
@require_auth
def get_profile():
    """Return all of the player's current selections in a single response."""
    steamid = _steamid()
    db = get_db()
    with db.cursor() as cur:
        cur.execute('SELECT * FROM wp_player_skins WHERE steamid = %s ORDER BY weapon_team, weapon_defindex', (steamid,))
        skins = [_process_skin_row(r) for r in cur.fetchall()]

        cur.execute('SELECT weapon_team, knife FROM wp_player_knife WHERE steamid = %s', (steamid,))
        knives = cur.fetchall()

        cur.execute('SELECT weapon_team, weapon_defindex FROM wp_player_gloves WHERE steamid = %s', (steamid,))
        gloves = cur.fetchall()

        cur.execute('SELECT agent_ct, agent_t FROM wp_player_agents WHERE steamid = %s', (steamid,))
        agents = cur.fetchone() or {'agent_ct': None, 'agent_t': None}

    return jsonify({
        'steamid': steamid,
        'skins': skins,
        'knives': knives,
        'gloves': gloves,
        'agents': agents,
    })
