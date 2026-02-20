"""Read-only skin catalog endpoints backed by bymykel's CSGO-API."""
import logging
from flask import Blueprint, jsonify, current_app
from .. import cache

logger = logging.getLogger(__name__)
catalog_bp = Blueprint('catalog', __name__)

# CS2 weapon name → item definition index mapping.
# Used by the frontend to correlate catalog entries with DB weapon_defindex values.
WEAPON_DEFINDEX: dict[str, int] = {
    # Pistols
    'weapon_deagle':        1,
    'weapon_elite':         2,
    'weapon_fiveseven':     3,
    'weapon_glock':         4,
    'weapon_hkp2000':       32,
    'weapon_p250':          36,
    'weapon_usp_silencer':  61,
    'weapon_cz75a':         63,
    'weapon_revolver':      64,
    'weapon_tec9':          30,
    # SMGs
    'weapon_mac10':         17,
    'weapon_mp5sd':         23,
    'weapon_mp7':           33,
    'weapon_mp9':           34,
    'weapon_p90':           19,
    'weapon_bizon':         26,
    'weapon_ump45':         24,
    # Rifles
    'weapon_ak47':          7,
    'weapon_aug':           8,
    'weapon_famas':         10,
    'weapon_galilar':       13,
    'weapon_m4a1':          16,
    'weapon_m4a1_silencer': 60,
    'weapon_sg556':         39,
    # Sniper rifles
    'weapon_awp':           9,
    'weapon_g3sg1':         11,
    'weapon_scar20':        38,
    'weapon_ssg08':         40,
    # Heavy
    'weapon_nova':          35,
    'weapon_xm1014':        25,
    'weapon_sawedoff':      29,
    'weapon_mag7':          27,
    'weapon_m249':          14,
    'weapon_negev':         28,
    # Knives (T side)
    'weapon_knife':             42,
    'weapon_knife_bayonet':     500,
    'weapon_knife_flip':        505,
    'weapon_knife_gut':         506,
    'weapon_knife_karambit':    507,
    'weapon_knife_m9_bayonet':  508,
    'weapon_knife_tactical':    509,
    'weapon_knife_falchion':    512,
    'weapon_knife_survival_bowie': 514,
    'weapon_knife_butterfly':   515,
    'weapon_knife_push':        516,
    'weapon_knife_cord':        517,
    'weapon_knife_canis':       518,
    'weapon_knife_ursus':       519,
    'weapon_knife_gypsy_jackknife': 520,
    'weapon_knife_outdoor':     521,
    'weapon_knife_stiletto':    522,
    'weapon_knife_widowmaker':  523,
    'weapon_knife_skeleton':    525,
    'weapon_knife_css':         526,
    # Knives (CT side)
    'weapon_knife_ct':          500,
    # Gloves
    'weapon_fists':             5,
    'studded_bloodhound_gloves': 5027,
    'studded_brokenfang_gloves': 4725,
    'weapon_handwrap':          4725,
}


def _ttl() -> int:
    return current_app.config.get('SKIN_CACHE_TTL', 3600)


def _enrich_skins(items: list) -> list:
    """Add weapon_defindex to each catalog item.

    bymykel provides weapon.weapon_id which IS the numeric defindex — prefer that
    over our manual map so gloves, knives, and any future items work automatically.
    """
    out = []
    for item in items:
        weapon = item.get('weapon') or {}
        weapon_id = weapon.get('id', '')
        defindex = weapon.get('weapon_id') or WEAPON_DEFINDEX.get(weapon_id)
        entry = dict(item)
        entry['weapon_defindex'] = defindex
        out.append(entry)
    return out


@catalog_bp.route('/skins')
def skins():
    try:
        data = cache.get_skins(_ttl())
    except Exception:
        logger.exception('Failed to fetch skins catalog')
        return jsonify({'error': 'Failed to fetch skin catalog'}), 502
    return jsonify(_enrich_skins(data))


@catalog_bp.route('/knives')
def knives():
    try:
        data = cache.get_knives(_ttl())
        data = [s for s in data if (s.get('weapon') or {}).get('id', '').startswith('weapon_knife')]
    except Exception:
        logger.exception('Failed to fetch knives catalog')
        return jsonify({'error': 'Failed to fetch knife catalog'}), 502
    return jsonify(_enrich_skins(data))


@catalog_bp.route('/gloves')
def gloves():
    try:
        data = cache.get_gloves(_ttl())
        data = [s for s in data if
            (s.get('category') or {}).get('id') == 'sfui_invpanel_filter_gloves']
    except Exception:
        logger.exception('Failed to fetch gloves catalog')
        return jsonify({'error': 'Failed to fetch glove catalog'}), 502
    return jsonify(_enrich_skins(data))


@catalog_bp.route('/stickers')
def stickers():
    try:
        data = cache.get_stickers(_ttl())
    except Exception:
        logger.exception('Failed to fetch stickers catalog')
        return jsonify({'error': 'Failed to fetch sticker catalog'}), 502
    result = [
        {
            'def_index': int(s.get('def_index') or 0),
            'name':      s.get('name', ''),
            'image':     s.get('image', ''),
            'rarity':    s.get('rarity') or {},
            'effect':    s.get('effect', ''),
        }
        for s in data
        if s.get('def_index')
    ]
    return jsonify(result)


@catalog_bp.route('/agents')
def agents():
    try:
        data = cache.get_agents(_ttl())
    except Exception:
        logger.exception('Failed to fetch agents catalog')
        return jsonify({'error': 'Failed to fetch agent catalog'}), 502
    return jsonify(data)


@catalog_bp.route('/defindex-map')
def defindex_map():
    """Expose the weapon name → defindex mapping for the frontend."""
    return jsonify(WEAPON_DEFINDEX)
