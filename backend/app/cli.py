"""Flask CLI commands for local setup (``flask --app run <command>``)."""
import secrets

import click

from app.extensions import db
from app.models import User
from app.services.workspace import seed_default_workspace, seed_demo_workspace

DEMO_USERNAME = "demo"
DEMO_EMAIL = "demo@example.com"


def get_or_create_demo_user():
    user = User.query.filter_by(username=DEMO_USERNAME).first()
    if user:
        return user
    user = User(username=DEMO_USERNAME, email=DEMO_EMAIL)
    # Nobody logs in with a password: access is via /api/auth/demo only.
    user.set_password(secrets.token_urlsafe(32))
    db.session.add(user)
    db.session.commit()
    return user


def register_cli(app):
    @app.cli.command("seed-demo")
    def seed_demo():
        """Create the demo user and six months of sample transactions."""
        user = get_or_create_demo_user()
        seed_demo_workspace(user.id)
        click.echo(f"Demo workspace ready for '{user.username}'.")

    @app.cli.command("create-user")
    @click.argument("username")
    @click.argument("email")
    @click.password_option()
    def create_user(username, email, password):
        """Create a user with the default categories and rules."""
        if User.query.filter((User.username == username) | (User.email == email.lower())).first():
            raise click.ClickException("That username or email already exists.")
        user = User(username=username, email=email.lower())
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        seed_default_workspace(user.id)
        click.echo(f"Created user '{username}'.")
