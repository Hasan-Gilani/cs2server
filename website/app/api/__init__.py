from flask import Blueprint

from .player import player_bp
from .catalog import catalog_bp

api_bp = Blueprint('api', __name__)

api_bp.register_blueprint(player_bp, url_prefix='/player')
api_bp.register_blueprint(catalog_bp, url_prefix='/catalog')
