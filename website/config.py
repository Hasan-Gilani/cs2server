import os
from dotenv import load_dotenv

load_dotenv('/var/www/cs2-skins/.env')


class Config:
    # Flask
    SECRET_KEY: str = os.environ['SECRET_KEY']
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = 'Lax'
    SESSION_COOKIE_SECURE: bool = os.getenv('SESSION_COOKIE_SECURE', 'false').lower() == 'true'
    PERMANENT_SESSION_LIFETIME: int = int(os.getenv('SESSION_LIFETIME', '86400'))  # 24h

    # Database
    DB_HOST: str = os.getenv('DB_HOST', '127.0.0.1')
    DB_PORT: int = int(os.getenv('DB_PORT', '3306'))
    DB_NAME: str = os.environ['DB_NAME']
    DB_USER: str = os.environ['DB_USER']
    DB_PASS: str = os.environ['DB_PASS']

    # Steam
    STEAM_API_KEY: str = os.environ['STEAM_API_KEY']
    BASE_URL: str = os.getenv('BASE_URL', 'http://16.24.36.253')

    # Skin catalog cache TTL in seconds
    SKIN_CACHE_TTL: int = int(os.getenv('SKIN_CACHE_TTL', '3600'))
