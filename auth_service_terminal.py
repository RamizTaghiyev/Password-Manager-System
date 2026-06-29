# terminal version 

import sqlite3
import bcrypt
import uuid
import re
from getpass import getpass


DB_PATH = r"C:\Users\ramiz\Documents\GitHub\Password-Manager-System\password_manager.db"

MIN_PASSWORD_LENGTH = 12
MAX_BCRYPT_BYTES = 72
BCRYPT_ROUNDS = 12


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


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
        pw_change_request INTEGER DEFAULT 0
    )
    """)

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


def register_user():
    print("\n--- SIGN UP ---")

    full_name = input("Full name: ").strip()
    email = input("Email: ").strip().lower()

    if not full_name:
        print("Full name cannot be empty.")
        return

    if not is_valid_email(email):
        print("Invalid email format.")
        return

    password = getpass("Password: ")
    confirm_password = getpass("Confirm password: ")

    if password != confirm_password:
        print("Passwords do not match.")
        return

    valid, message = validate_password(password)

    if not valid:
        print(message)
        return

    users_id = str(uuid.uuid4())
    role = "user"
    password_hash = hash_password(password)

    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
        INSERT INTO users (
            users_id,
            full_name,
            role,
            email,
            password_hash,
            is_active,
            pw_change_request
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            users_id,
            full_name,
            role,
            email,
            password_hash,
            1,
            0
        ))

        connection.commit()
        print("User registered successfully.")

    except sqlite3.IntegrityError:
        print("This email is already registered.")

    finally:
        connection.close()


def login_user():
    print("\n--- LOGIN ---")

    email = input("Email: ").strip().lower()
    password = getpass("Password: ")

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
    SELECT users_id, full_name, email, password_hash, is_active
    FROM users
    WHERE email = ?
    """, (email,))

    user = cursor.fetchone()
    connection.close()

    if user is None:
        print("Invalid email or password.")
        return

    users_id, full_name, email, stored_hash, is_active = user

    if is_active != 1:
        print("This account is disabled.")
        return

    if check_password(password, stored_hash):
        print("Login successful.")
        print(f"Welcome, {full_name}!")
    else:
        print("Invalid email or password.")


def show_menu():
    while True:
        print("\n==============================")
        print("PASSWORD MANAGER AUTH SYSTEM")
        print("==============================")
        print("1. Sign up")
        print("2. Login")
        print("3. Exit")

        choice = input("Choose option: ").strip()

        if choice == "1":
            register_user()
        elif choice == "2":
            login_user()
        elif choice == "3":
            print("exiting...")
            break
        else:
            print("Invalid option.")


def main():
    setup_database()
    show_menu()


main()
