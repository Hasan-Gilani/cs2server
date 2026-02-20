"""Per-request MySQL connection via Flask's application context."""
import pymysql
import pymysql.cursors
from flask import g, current_app


def get_db() -> pymysql.connections.Connection:
    """Return the DB connection for the current request, creating it if needed."""
    if 'db' not in g:
        cfg = current_app.config
        g.db = pymysql.connect(
            host=cfg['DB_HOST'],
            port=cfg['DB_PORT'],
            user=cfg['DB_USER'],
            password=cfg['DB_PASS'],
            database=cfg['DB_NAME'],
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=False,
            connect_timeout=5,
        )
    return g.db


def close_db(exc=None) -> None:
    """Teardown: close DB connection at end of request."""
    db = g.pop('db', None)
    if db is not None:
        try:
            db.close()
        except Exception:
            pass
