"""Steam OpenID 2.0 authentication."""
import re
import logging
from urllib.parse import urlencode

import requests
from flask import Blueprint, redirect, request, session, current_app, jsonify

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)

_STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'
_STEAMID_RE = re.compile(r'https://steamcommunity\.com/openid/id/(\d{17})$')

_OPENID_NS = 'http://specs.openid.net/auth/2.0'
_OPENID_IDENTIFIER_SELECT = f'{_OPENID_NS}/identifier_select'


@auth_bp.route('/steam')
def steam_login():
    """Redirect the user to Steam's OpenID login page."""
    callback = current_app.config['BASE_URL'] + '/auth/steam/callback'
    realm = current_app.config['BASE_URL']

    params = {
        'openid.ns': _OPENID_NS,
        'openid.mode': 'checkid_setup',
        'openid.return_to': callback,
        'openid.realm': realm,
        'openid.identity': _OPENID_IDENTIFIER_SELECT,
        'openid.claimed_id': _OPENID_IDENTIFIER_SELECT,
    }
    return redirect(f'{_STEAM_OPENID_URL}?{urlencode(params)}')


@auth_bp.route('/steam/callback')
def steam_callback():
    """Validate Steam's OpenID response, then establish a session."""
    params = dict(request.args)

    # Verify with Steam
    params['openid.mode'] = 'check_authentication'
    try:
        resp = requests.post(_STEAM_OPENID_URL, data=params, timeout=10)
        resp.raise_for_status()
    except requests.RequestException:
        logger.exception('Steam OpenID verification request failed')
        return jsonify({'error': 'Steam authentication failed'}), 502

    if 'is_valid:true' not in resp.text:
        return jsonify({'error': 'Steam authentication invalid'}), 401

    match = _STEAMID_RE.match(params.get('openid.claimed_id', ''))
    if not match:
        return jsonify({'error': 'Could not extract SteamID'}), 401

    steamid = match.group(1)
    profile = _fetch_steam_profile(steamid)

    session.permanent = True
    session['steamid'] = steamid
    session['steam_name'] = profile.get('personaname', steamid)
    session['steam_avatar'] = profile.get('avatarfull', '')

    return redirect('/')


@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'status': 'ok'})


@auth_bp.route('/me')
def me():
    """Return current session user or 401."""
    if 'steamid' not in session:
        return jsonify({'authenticated': False}), 401
    return jsonify({
        'authenticated': True,
        'steamid': session['steamid'],
        'name': session.get('steam_name'),
        'avatar': session.get('steam_avatar'),
    })


# ── Internal helpers ──────────────────────────────────────────────────────────

def _fetch_steam_profile(steamid: str) -> dict:
    try:
        resp = requests.get(
            'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/',
            params={
                'key': current_app.config['STEAM_API_KEY'],
                'steamids': steamid,
            },
            timeout=10,
        )
        resp.raise_for_status()
        players = resp.json().get('response', {}).get('players', [])
        return players[0] if players else {}
    except Exception:
        logger.exception('Failed to fetch Steam profile for %s', steamid)
        return {}
