import logging
from flask import Flask, jsonify, render_template
from flask_cors import CORS

from .db import close_db
from .auth import auth_bp
from .api import api_bp


def create_app() -> Flask:
    app = Flask(
        __name__,
        template_folder='../templates',
        static_folder='../static',
        static_url_path='/static',
    )
    app.config.from_object('config.Config')

    # Allow cross-origin requests from the React dev server in development
    CORS(app, resources={r'/api/*': {'origins': '*'}}, supports_credentials=True)

    # Blueprints
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(api_bp, url_prefix='/api')

    # DB teardown
    app.teardown_appcontext(close_db)

    # ── Routes ────────────────────────────────────────────────────────────────

    @app.route('/health')
    def health():
        return jsonify({'status': 'ok'})

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def spa_shell(path):
        """Catch-all: serve the SPA shell. React router handles the rest."""
        return render_template('index.html')

    # ── Global error handlers ─────────────────────────────────────────────────

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({'error': 'Bad request', 'detail': str(e)}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({'error': 'Unauthorized'}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({'error': 'Forbidden'}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Not found'}), 404

    @app.errorhandler(500)
    def internal_error(e):
        logging.exception('Unhandled exception')
        return jsonify({'error': 'Internal server error'}), 500

    return app
