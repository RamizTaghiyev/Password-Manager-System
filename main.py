import hashlib
import time
import secrets
import sqlite3
import os
import json
import urllib.request
from cryptography.exceptions import InvalidTag
from flask import Flask, request, jsonify, render_template

from auth_service import (
    setup_database,
    create_user,
    get_user_by_email,
    get_user_by_id,
    validate_password,
    is_valid_email,
    check_password,
    update_user_2fa_secret,
    enable_2fa,
    update_user_password
)

from twofa_service import (
    create_secret,
    create_qr_setup,
    verify_totp
)

from email_service import generate_email_code, send_verification_email

from vault_service import (
    setup_vault_table,
    add_vault_item,
    get_vault_items,
    reveal_vault_password,
    setup_server_password_change_request_table,
    create_server_password_change_request,
    get_server_password_change_requests,
    review_server_password_change_request,
    change_vault_password_after_approval
)


app = Flask(__name__)

CHANGE_PASSWORD_FLOWS = {}
FORGOT_PASSWORD_FLOWS = {}

FLOW_EXPIRY_SECONDS = 10 * 60
EMAIL_CODE_EXPIRY_SECONDS = 5 * 60


def hash_email_code(code):
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def is_flow_expired(flow):
    return time.time() > flow["expires_at"]

def make_error(message, status_code=400):
    return jsonify({
        "success": False,
        "error": message
    }), status_code


def user_response(user):
    return {
        "users_id": user["users_id"],
        "full_name": user["full_name"],
        "email": user["email"],
        "role": user["role"]
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/register", methods=["POST"])
def api_register():
    data = request.get_json()

    if data is None:
        return make_error("No JSON data received.")

    full_name = data.get("full_name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")

    if not full_name:
        return make_error("Full name cannot be empty.")

    if not is_valid_email(email):
        return make_error("Invalid email format.")

    if password != confirm_password:
        return make_error("Passwords do not match.")

    valid, message = validate_password(password)

    if not valid:
        return make_error(message)

    try:
        users_id = create_user(full_name, email, password)
    except sqlite3.IntegrityError:
        return make_error("This email is already registered.")

    secret = create_secret()
    update_user_2fa_secret(users_id, secret)

    otp_uri, qr_data_url = create_qr_setup(secret, email)

    return jsonify({
        "success": True,
        "message": "User created. 2FA setup required.",
        "users_id": users_id,
        "requires_2fa_setup": True,
        "secret": secret,
        "qr_data_url": qr_data_url
    })


@app.route("/api/setup-2fa", methods=["POST"])
def api_setup_2fa():
    data = request.get_json()

    if data is None:
        return make_error("No JSON data received.")

    users_id = data.get("users_id", "")
    code = data.get("code", "").strip()

    user = get_user_by_id(users_id)

    if user is None:
        return make_error("User not found.", 404)

    secret = user["totp_secret"]

    if secret is None:
        return make_error("2FA secret not found.")

    if not verify_totp(secret, code):
        return make_error("Wrong 2FA code.")

    enable_2fa(users_id)

    return jsonify({
        "success": True,
        "message": "2FA enabled successfully.",
        "user": user_response(user)
    })


@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json()

    if data is None:
        return make_error("No JSON data received.")

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = get_user_by_email(email)

    if user is None:
        return make_error("Invalid email or password.", 401)

    if user["is_active"] != 1:
        return make_error("This account is disabled.", 403)

    password_is_correct = check_password(password, user["password_hash"])

    if not password_is_correct:
        return make_error("Invalid email or password.", 401)

    secret = user["totp_secret"]

    if secret is None:
        secret = create_secret()
        update_user_2fa_secret(user["users_id"], secret)

    otp_uri, qr_data_url = create_qr_setup(secret, user["email"])

    if user["is_2fa_enabled"] != 1:
        return jsonify({
            "success": True,
            "message": "Password correct. 2FA setup required.",
            "users_id": user["users_id"],
            "requires_2fa_setup": True,
            "secret": secret,
            "qr_data_url": qr_data_url
        })

    return jsonify({
        "success": True,
        "message": "Password correct. 2FA verification required.",
        "users_id": user["users_id"],
        "requires_2fa": True,
        "secret": secret,
        "qr_data_url": qr_data_url
    })


@app.route("/api/verify-login-2fa", methods=["POST"])
def api_verify_login_2fa():
    data = request.get_json()

    if data is None:
        return make_error("No JSON data received.")

    users_id = data.get("users_id", "")
    code = data.get("code", "").strip()

    user = get_user_by_id(users_id)

    if user is None:
        return make_error("User not found.", 404)

    secret = user["totp_secret"]

    if secret is None:
        return make_error("2FA secret not found.")

    if not verify_totp(secret, code):
        return make_error("Wrong 2FA code.", 401)

    return jsonify({
        "success": True,
        "message": "Login successful.",
        "user": user_response(user)
    })

@app.route("/api/change-password/check-old", methods=["POST"])
def api_change_password_check_old():
    data = request.get_json()

    if data is None:
        return make_error("No JSON data received.")

    users_id = data.get("users_id", "")
    old_password = data.get("old_password", "")

    user = get_user_by_id(users_id)

    if user is None:
        return make_error("User not found.", 404)

    if user["is_active"] != 1:
        return make_error("This account is disabled.", 403)

    if not check_password(old_password, user["password_hash"]):
        return make_error("Old password is wrong.", 401)

    if user["totp_secret"] is None:
        return make_error("2FA is not set up for this user.")

    flow_id = secrets.token_urlsafe(32)

    CHANGE_PASSWORD_FLOWS[flow_id] = {
        "users_id": users_id,
        "totp_verified": False,
        "email_verified": False,
        "email_code_hash": None,
        "email_code_expires_at": None,
        "expires_at": time.time() + FLOW_EXPIRY_SECONDS
    }

    otp_uri, qr_data_url = create_qr_setup(
        user["totp_secret"],
        user["email"]
    )

    return jsonify({
        "success": True,
        "message": "Old password verified.",
        "flow_id": flow_id,
        "secret": user["totp_secret"],
        "qr_data_url": qr_data_url
    })


@app.route("/api/change-password/verify-2fa", methods=["POST"])
def api_change_password_verify_2fa():
    data = request.get_json()

    if data is None:
        return make_error("No JSON data received.")

    flow_id = data.get("flow_id", "")
    code = data.get("code", "").strip()

    flow = CHANGE_PASSWORD_FLOWS.get(flow_id)

    if flow is None:
        return make_error("Invalid password change session.", 400)

    if is_flow_expired(flow):
        del CHANGE_PASSWORD_FLOWS[flow_id]
        return make_error("Password change session expired.", 401)

    user = get_user_by_id(flow["users_id"])

    if user is None:
        return make_error("User not found.", 404)

    if user["totp_secret"] is None:
        return make_error("2FA is not set up for this user.")

    if not verify_totp(user["totp_secret"], code):
        return make_error("Wrong 2FA code.", 401)

    email_code = generate_email_code()

    flow["totp_verified"] = True
    flow["email_code_hash"] = hash_email_code(email_code)
    flow["email_code_expires_at"] = time.time() + EMAIL_CODE_EXPIRY_SECONDS

    try:
        send_verification_email(
            receiver_email=user["email"],
            verification_code=email_code,
            purpose="Change Password"
        )
    except Exception as error:
        print(error)
        return make_error("Could not send email verification code.", 500)

    return jsonify({
        "success": True,
        "message": "2FA verified. Email verification code sent."
    })


@app.route("/api/change-password/verify-email-code", methods=["POST"])
def api_change_password_verify_email_code():
    data = request.get_json()

    if data is None:
        return make_error("No JSON data received.")

    flow_id = data.get("flow_id", "")
    email_code = data.get("email_code", "").strip()

    flow = CHANGE_PASSWORD_FLOWS.get(flow_id)

    if flow is None:
        return make_error("Invalid password change session.", 400)

    if is_flow_expired(flow):
        del CHANGE_PASSWORD_FLOWS[flow_id]
        return make_error("Password change session expired.", 401)

    if not flow["totp_verified"]:
        return make_error("2FA must be verified first.", 401)

    if time.time() > flow["email_code_expires_at"]:
        return make_error("Email verification code expired.", 401)

    if hash_email_code(email_code) != flow["email_code_hash"]:
        return make_error("Wrong email verification code.", 401)

    flow["email_verified"] = True

    return jsonify({
        "success": True,
        "message": "Email verified."
    })


@app.route("/api/change-password/finish", methods=["POST"])
def api_change_password_finish():
    data = request.get_json()

    if data is None:
        return make_error("No JSON data received.")

    flow_id = data.get("flow_id", "")
    new_password = data.get("new_password", "")
    confirm_new_password = data.get("confirm_new_password", "")

    flow = CHANGE_PASSWORD_FLOWS.get(flow_id)

    if flow is None:
        return make_error("Invalid password change session.", 400)

    if is_flow_expired(flow):
        del CHANGE_PASSWORD_FLOWS[flow_id]
        return make_error("Password change session expired.", 401)

    if not flow["email_verified"]:
        return make_error("Email must be verified first.", 401)

    if new_password != confirm_new_password:
        return make_error("New passwords do not match.")

    valid, message = validate_password(new_password)

    if not valid:
        return make_error(message)

    update_user_password(flow["users_id"], new_password)

    del CHANGE_PASSWORD_FLOWS[flow_id]

    return jsonify({
        "success": True,
        "message": "Password changed successfully."
    })

@app.route("/api/forgot-password/start", methods=["POST"])
def api_forgot_password_start():
    data = request.get_json()

    if data is None:
        return make_error("No JSON data received.")

    email = data.get("email", "").strip().lower()

    user = get_user_by_email(email)

    if user is None:
        return make_error("User not found.", 404)

    if user["is_active"] != 1:
        return make_error("This account is disabled.", 403)

    if user["totp_secret"] is None:
        return make_error("2FA is not set up for this user.")

    flow_id = secrets.token_urlsafe(32)

    FORGOT_PASSWORD_FLOWS[flow_id] = {
        "users_id": user["users_id"],
        "totp_verified": False,
        "email_verified": False,
        "email_code_hash": None,
        "email_code_expires_at": None,
        "expires_at": time.time() + FLOW_EXPIRY_SECONDS
    }

    otp_uri, qr_data_url = create_qr_setup(
        user["totp_secret"],
        user["email"]
    )

    return jsonify({
        "success": True,
        "message": "User found. Continue to 2FA.",
        "flow_id": flow_id,
        "secret": user["totp_secret"],
        "qr_data_url": qr_data_url
    })


@app.route("/api/forgot-password/verify-2fa", methods=["POST"])
def api_forgot_password_verify_2fa():
    data = request.get_json()

    if data is None:
        return make_error("No JSON data received.")

    flow_id = data.get("flow_id", "")
    code = data.get("code", "").strip()

    flow = FORGOT_PASSWORD_FLOWS.get(flow_id)

    if flow is None:
        return make_error("Invalid forgot password session.", 400)

    if is_flow_expired(flow):
        del FORGOT_PASSWORD_FLOWS[flow_id]
        return make_error("Forgot password session expired.", 401)

    user = get_user_by_id(flow["users_id"])

    if user is None:
        return make_error("User not found.", 404)

    if user["totp_secret"] is None:
        return make_error("2FA is not set up for this user.")

    if not verify_totp(user["totp_secret"], code):
        return make_error("Wrong 2FA code.", 401)

    email_code = generate_email_code()

    flow["totp_verified"] = True
    flow["email_code_hash"] = hash_email_code(email_code)
    flow["email_code_expires_at"] = time.time() + EMAIL_CODE_EXPIRY_SECONDS

    try:
        send_verification_email(
            receiver_email=user["email"],
            verification_code=email_code,
            purpose="Forgot Password"
        )
    except Exception as error:
        print(error)
        return make_error("Could not send email verification code.", 500)

    return jsonify({
        "success": True,
        "message": "2FA verified. Email verification code sent."
    })


@app.route("/api/forgot-password/verify-email-code", methods=["POST"])
def api_forgot_password_verify_email_code():
    data = request.get_json()

    if data is None:
        return make_error("No JSON data received.")

    flow_id = data.get("flow_id", "")
    email_code = data.get("email_code", "").strip()

    flow = FORGOT_PASSWORD_FLOWS.get(flow_id)

    if flow is None:
        return make_error("Invalid forgot password session.", 400)

    if is_flow_expired(flow):
        del FORGOT_PASSWORD_FLOWS[flow_id]
        return make_error("Forgot password session expired.", 401)

    if not flow["totp_verified"]:
        return make_error("2FA must be verified first.", 401)

    if time.time() > flow["email_code_expires_at"]:
        return make_error("Email verification code expired.", 401)

    if hash_email_code(email_code) != flow["email_code_hash"]:
        return make_error("Wrong email verification code.", 401)

    flow["email_verified"] = True

    return jsonify({
        "success": True,
        "message": "Email verified."
    })


@app.route("/api/forgot-password/finish", methods=["POST"])
def api_forgot_password_finish():
    data = request.get_json()

    if data is None:
        return make_error("No JSON data received.")

    flow_id = data.get("flow_id", "")
    new_password = data.get("new_password", "")
    confirm_new_password = data.get("confirm_new_password", "")

    flow = FORGOT_PASSWORD_FLOWS.get(flow_id)

    if flow is None:
        return make_error("Invalid forgot password session.", 400)

    if is_flow_expired(flow):
        del FORGOT_PASSWORD_FLOWS[flow_id]
        return make_error("Forgot password session expired.", 401)

    if not flow["totp_verified"]:
        return make_error("2FA must be verified first.", 401)

    if not flow["email_verified"]:
        return make_error("Email must be verified first.", 401)

    if new_password != confirm_new_password:
        return make_error("New passwords do not match.")

    valid, message = validate_password(new_password)

    if not valid:
        return make_error(message)

    update_user_password(flow["users_id"], new_password)

    del FORGOT_PASSWORD_FLOWS[flow_id]

    return jsonify({
        "success": True,
        "message": "Password reset successfully. You can now log in."
    })

@app.route("/api/vault-items", methods=["GET"])
def api_get_vault_items():
    users_id = request.args.get("users_id", "")

    if users_id == "":
        return make_error("Missing users_id.")

    items = get_vault_items(users_id)

    return jsonify({
        "success": True,
        "items": items
    })


@app.route("/api/vault-items", methods=["POST"])
def api_add_vault_item():
    data = request.get_json()

    if data is None:
        return make_error("No JSON data received.")

    users_id = data.get("users_id", "")
    host_name = data.get("host_name", "").strip()
    password = data.get("password", "")
    credential_type = data.get("type", "Server")
    description = data.get("description", "").strip()

    if users_id == "":
        return make_error("Missing users_id.")

    if host_name == "":
        return make_error("Host name cannot be empty.")

    if password == "":
        return make_error("Password cannot be empty.")

    vault_id = add_vault_item(
        users_id,
        host_name,
        password,
        credential_type,
        description
    )

    return jsonify({
        "success": True,
        "message": "Server credential saved.",
        "vault_id": vault_id
    })


@app.route("/api/vault-items/reveal", methods=["POST"])
def api_reveal_vault_password():
    data = request.get_json()

    if data is None:
        return make_error("No JSON data received.")

    users_id = data.get("users_id", "")
    vault_id = data.get("vault_id", "")

    try:
        password = reveal_vault_password(users_id, vault_id)
    except InvalidTag:
        return make_error(
            "Cannot decrypt this vault item. It was probably encrypted with a different vault key, or the encrypted data was inserted manually/corrupted.",
            500
        )

    if password is None:
        return make_error("Vault item not found.", 404)

    return jsonify({
        "success": True,
        "password": password
    })


def send_slack_password_change_notification(change_request):
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")

    if not webhook_url:
        return

    text = (
        "New server password change request\n"
        f"Host: {change_request['host_name']}\n"
        f"Type: {change_request['credential_type']}\n"
        f"Requested by: {change_request['requested_by_name']} ({change_request['requested_by_email']})\n"
        f"Reason: {change_request['reason'] or 'No reason provided'}"
    )

    payload = {
        "text": text
    }

    data = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        webhook_url,
        data=data,
        headers={
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        urllib.request.urlopen(request, timeout=5)
    except Exception:
        pass


@app.route("/api/server-password-change-requests", methods=["GET"])
def api_get_server_password_change_requests():
    users_id = request.args.get("users_id", "")

    if users_id == "":
        return make_error("users_id is required.")

    requests_list = get_server_password_change_requests(users_id)

    if requests_list is None:
        return make_error("User not found.", 404)

    return jsonify({
        "success": True,
        "requests": requests_list
    })


@app.route("/api/server-password-change-requests", methods=["POST"])
def api_create_server_password_change_request():
    data = request.get_json()

    if data is None:
        return make_error("No JSON data received.")

    users_id = data.get("users_id", "")
    vault_id = data.get("vault_id", "")
    reason = data.get("reason", "").strip()

    if users_id == "":
        return make_error("users_id is required.")

    if vault_id == "":
        return make_error("vault_id is required.")

    change_request, error = create_server_password_change_request(
        users_id,
        vault_id,
        reason
    )

    if change_request is None:
        return make_error(error)

    if error is None:
        send_slack_password_change_notification(change_request)

    return jsonify({
        "success": True,
        "message": error or "Password change request sent to Super Admin.",
        "request": change_request
    })


@app.route("/api/server-password-change-requests/review", methods=["POST"])
def api_review_server_password_change_request():
    data = request.get_json()

    if data is None:
        return make_error("No JSON data received.")

    super_admin_id = data.get("super_admin_id", "")
    request_id = data.get("request_id", "")
    decision = data.get("decision", "")
    review_note = data.get("review_note", "").strip()

    if super_admin_id == "":
        return make_error("super_admin_id is required.")

    if request_id == "":
        return make_error("request_id is required.")

    success, message = review_server_password_change_request(
        super_admin_id,
        request_id,
        decision,
        review_note
    )

    if not success:
        return make_error(message)

    return jsonify({
        "success": True,
        "message": message
    })


@app.route("/api/vault-items/change-server-password", methods=["POST"])
def api_change_server_password_after_approval():
    data = request.get_json()

    if data is None:
        return make_error("No JSON data received.")

    users_id = data.get("users_id", "")
    vault_id = data.get("vault_id", "")
    new_password = data.get("new_password", "")
    confirm_new_password = data.get("confirm_new_password", "")

    if users_id == "":
        return make_error("users_id is required.")

    if vault_id == "":
        return make_error("vault_id is required.")

    if new_password == "":
        return make_error("New server password is required.")

    if new_password != confirm_new_password:
        return make_error("Passwords do not match.")

    success, message = change_vault_password_after_approval(
        users_id,
        vault_id,
        new_password
    )

    if not success:
        return make_error(message)

    return jsonify({
        "success": True,
        "message": message
    })

def main():
    setup_database()
    setup_vault_table()
    setup_server_password_change_request_table()

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )


if __name__ == "__main__":
    main()