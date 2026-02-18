#!/usr/bin/env python3
"""
Tiny HTTP redirect server — serves http://IP:8080/ and redirects to
steam://connect/IP:PORT/PASSWORD so Discord links open Steam directly.
Reads IP, port, and password from ~/.env and ~/.cs2_discord_state.
"""

import http.server
import os

ENV_FILE   = os.path.expanduser('~/.env')
STATE_FILE = os.path.expanduser('~/.cs2_discord_state')

def read_config():
    cfg = {}
    for path in [ENV_FILE, STATE_FILE]:
        try:
            with open(path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, _, v = line.partition('=')
                        cfg[k.strip()] = v.strip()
        except OSError:
            pass
    return cfg

class RedirectHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        cfg  = read_config()
        ip   = cfg.get('PUBLIC_IP', '')
        port = cfg.get('PORT', '27015')
        pw   = cfg.get('SERVER_PASSWORD', '')
        url  = f'steam://connect/{ip}:{port}/{pw}' if pw else f'steam://connect/{ip}:{port}'
        self.send_response(302)
        self.send_header('Location', url)
        self.send_header('Content-Length', '0')
        self.end_headers()

    def log_message(self, *args):
        pass  # suppress access logs

if __name__ == '__main__':
    server = http.server.HTTPServer(('0.0.0.0', 8080), RedirectHandler)
    print('CS2 redirect server listening on :8080')
    server.serve_forever()
