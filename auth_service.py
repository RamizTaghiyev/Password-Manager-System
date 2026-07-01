import os
import sqlite3
import bcrypt
import uuid
import re


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "password_manager.db")

MIN_PASSWORD_LENGTH = 12
MAX_BCRYPT_BYTES = 72
BCRYPT_ROUNDS = 12


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def add_column_if_missing(connection, table_name, column_name, column_type):
    cursor = connection.cursor()

    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()

    for column in columns:
        if column["name"] == column_name:
            return

    cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")


def setup_database():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        users_id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        pw_change_request INTEGER DEFAULT 0,
        totp_secret TEXT,
        is_2fa_enabled INTEGER DEFAULT 0
    )
    """)

    add_column_if_missing(connection, "users", "totp_secret", "TEXT")
    add_column_if_missing(connection, "users", "is_2fa_enabled", "INTEGER DEFAULT 0")

    connection.commit()
    connection.close()


def is_valid_email(email):
    email_pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"
    return re.match(email_pattern, email) is not None


def validate_password(password):
    if len(password) < MIN_PASSWORD_LENGTH:
        return False, "Password must be at least 12 characters long."

    if len(password.encode("utf-8")) > MAX_BCRYPT_BYTES:
        return False, "Password is too long for bcrypt."

    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."

    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."

    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one number."

    if not re.search(r"[^A-Za-z0-9]", password):
        return False, "Password must contain at least one symbol."

    return True, "Password is valid."


def hash_password(password):
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    password_hash = bcrypt.hashpw(password_bytes, salt)

    return password_hash.decode("utf-8")


def check_password(password, stored_hash):
    password_bytes = password.encode("utf-8")
    stored_hash_bytes = stored_hash.encode("utf-8")

    return bcrypt.checkpw(password_bytes, stored_hash_bytes)


def create_user(full_name, email, password):
    users_id = str(uuid.uuid4())
    role = "admin"
    password_hash = hash_password(password)

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
    INSERT INTO users (
        users_id,
        full_name,
        role,
        email,
        password_hash,
        is_active,
        pw_change_request,
        is_2fa_enabled
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        users_id,
        full_name,
        role,
        email,
        password_hash,
        1,
        0,
        0
    ))

    connection.commit()
    connection.close()

    return users_id


def get_user_by_email(email):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
    SELECT *
    FROM users
    WHERE email = ?
    """, (email,))

    user = cursor.fetchone()
    connection.close()

    return user


def get_user_by_id(users_id):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
    SELECT *
    FROM users
    WHERE users_id = ?
    """, (users_id,))

    user = cursor.fetchone()
    connection.close()

    return user


def update_user_2fa_secret(users_id, secret):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
    UPDATE users
    SET totp_secret = ?
    WHERE users_id = ?
    """, (secret, users_id))

    connection.commit()
    connection.close()


def enable_2fa(users_id):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
    UPDATE users
    SET is_2fa_enabled = 1
    WHERE users_id = ?
    """, (users_id,))

    connection.commit()
    connection.close()


def update_user_password(users_id, new_password):
    password_hash = hash_password(new_password)

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
    UPDATE users
    SET password_hash = ?
    WHERE users_id = ?
    """, (password_hash, users_id))

    connection.commit()
    connection.close()