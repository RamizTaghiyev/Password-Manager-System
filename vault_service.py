import uuid
from auth_service import get_connection
from vault_crypto import encrypt_password, decrypt_password


def add_column_if_missing(connection, table_name, column_name, column_type):
    cursor = connection.cursor()
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()

    for column in columns:
        if column["name"] == column_name:
            return

    cursor.execute(
        f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"
    )


def setup_vault_table():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vault_items (
        vault_id TEXT PRIMARY KEY,
        users_id TEXT NOT NULL,
        host_name TEXT NOT NULL,
        description TEXT DEFAULT '',
        encrypted_data TEXT NOT NULL,
        nonce TEXT NOT NULL,
        auth_tag TEXT NOT NULL,
        credential_type TEXT DEFAULT 'Server',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (users_id) REFERENCES users(users_id)
    )
    """)

    add_column_if_missing(
        connection,
        "vault_items",
        "credential_type",
        "TEXT DEFAULT 'Server'"
    )

    add_column_if_missing(
        connection,
        "vault_items",
        "description",
        "TEXT DEFAULT ''"
    )

    add_column_if_missing(
        connection,
        "vault_items",
        "totp_secret_data",
        "TEXT"
    )

    add_column_if_missing(
        connection,
        "vault_items",
        "totp_secret_nonce",
        "TEXT"
    )

    add_column_if_missing(
        connection,
        "vault_items",
        "totp_secret_tag",
        "TEXT"
    )

    connection.commit()
    connection.close()


def add_vault_item(users_id, host_name, password, credential_type, description, totp_secret=""):
    encrypted = encrypt_password(password)

    vault_id = str(uuid.uuid4())

    totp_secret = (totp_secret or "").strip().replace(" ", "").upper()

    encrypted_totp_data = None
    encrypted_totp_nonce = None
    encrypted_totp_tag = None

    if totp_secret != "":
        encrypted_totp = encrypt_password(totp_secret)
        encrypted_totp_data = encrypted_totp["encrypted_data"]
        encrypted_totp_nonce = encrypted_totp["nonce"]
        encrypted_totp_tag = encrypted_totp["auth_tag"]

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
    INSERT INTO vault_items (
        vault_id,
        users_id,
        host_name,
        description,
        encrypted_data,
        nonce,
        auth_tag,
        credential_type,
        totp_secret_data,
        totp_secret_nonce,
        totp_secret_tag
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        vault_id,
        users_id,
        host_name,
        description,
        encrypted["encrypted_data"],
        encrypted["nonce"],
        encrypted["auth_tag"],
        credential_type,
        encrypted_totp_data,
        encrypted_totp_nonce,
        encrypted_totp_tag
    ))

    connection.commit()
    connection.close()

    return vault_id

def set_vault_totp_secret(users_id, vault_id, totp_secret):
    totp_secret = (totp_secret or "").strip().replace(" ", "").upper()

    if totp_secret == "":
        return False, "TOTP secret cannot be empty."

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
    SELECT vault_id
    FROM vault_items
    WHERE vault_id = ?
    AND users_id = ?
    """, (vault_id, users_id))

    vault_item = cursor.fetchone()

    if vault_item is None:
        connection.close()
        return False, "Vault item not found or not owned by this user."

    encrypted_totp = encrypt_password(totp_secret)

    cursor.execute("""
    UPDATE vault_items
    SET
        totp_secret_data = ?,
        totp_secret_nonce = ?,
        totp_secret_tag = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE vault_id = ?
    AND users_id = ?
    """, (
        encrypted_totp["encrypted_data"],
        encrypted_totp["nonce"],
        encrypted_totp["auth_tag"],
        vault_id,
        users_id
    ))

    connection.commit()
    connection.close()

    return True, "TOTP secret saved for this credential."


def reveal_vault_totp_secret(users_id, vault_id):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
    SELECT totp_secret_data, totp_secret_nonce, totp_secret_tag
    FROM vault_items
    WHERE users_id = ?
    AND vault_id = ?
    """, (users_id, vault_id))

    row = cursor.fetchone()
    connection.close()

    if row is None:
        return None

    if row["totp_secret_data"] is None:
        return None

    secret = decrypt_password(
        row["totp_secret_data"],
        row["totp_secret_nonce"],
        row["totp_secret_tag"]
    )

    return secret


def get_vault_items(users_id):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
    SELECT
        vault_id,
        users_id,
        host_name,
        description,
        credential_type,
        created_at,
        updated_at,
        totp_secret_data
    FROM vault_items
    WHERE users_id = ?
    ORDER BY created_at DESC
    """, (users_id,))

    rows = cursor.fetchall()
    connection.close()

    items = []

    for row in rows:
        items.append({
            "vault_id": row["vault_id"],
            "users_id": row["users_id"],
            "host_name": row["host_name"],
            "description": row["description"] or "",
            "type": row["credential_type"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "password": "************",
            "has_totp": row["totp_secret_data"] is not None
        })

    return items


def reveal_vault_password(users_id, vault_id):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
    SELECT encrypted_data, nonce, auth_tag
    FROM vault_items
    WHERE users_id = ?
    AND vault_id = ?
    """, (users_id, vault_id))

    row = cursor.fetchone()
    connection.close()

    if row is None:
        return None

    password = decrypt_password(
        row["encrypted_data"],
        row["nonce"],
        row["auth_tag"]
    )

    return password

def setup_server_password_change_request_table():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS server_password_change_requests (
        request_id TEXT PRIMARY KEY,
        vault_id TEXT NOT NULL,
        requested_by TEXT NOT NULL,
        reason TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        reviewed_by TEXT,
        review_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP,
        completed_at TIMESTAMP,
        FOREIGN KEY (vault_id) REFERENCES vault_items(vault_id),
        FOREIGN KEY (requested_by) REFERENCES users(users_id),
        FOREIGN KEY (reviewed_by) REFERENCES users(users_id)
    )
    """)

    connection.commit()
    connection.close()


def get_request_by_id(request_id):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
    SELECT
        r.request_id,
        r.vault_id,
        r.requested_by,
        r.reason,
        r.status,
        r.reviewed_by,
        r.review_note,
        r.created_at,
        r.reviewed_at,
        r.completed_at,
        v.host_name,
        v.credential_type,
        u.full_name AS requested_by_name,
        u.email AS requested_by_email
    FROM server_password_change_requests r
    JOIN vault_items v ON r.vault_id = v.vault_id
    JOIN users u ON r.requested_by = u.users_id
    WHERE r.request_id = ?
    """, (request_id,))

    row = cursor.fetchone()
    connection.close()

    if row is None:
        return None

    return dict(row)


def create_server_password_change_request(users_id, vault_id, reason):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
    SELECT vault_id
    FROM vault_items
    WHERE vault_id = ?
    AND users_id = ?
    """, (vault_id, users_id))

    vault_item = cursor.fetchone()

    if vault_item is None:
        connection.close()
        return None, "Vault item not found or not owned by this user."

    cursor.execute("""
    SELECT request_id
    FROM server_password_change_requests
    WHERE vault_id = ?
    AND requested_by = ?
    AND status IN ('pending', 'approved')
    ORDER BY created_at DESC
    LIMIT 1
    """, (vault_id, users_id))

    existing_request = cursor.fetchone()

    if existing_request is not None:
        connection.close()
        request_data = get_request_by_id(existing_request["request_id"])
        return request_data, "A pending or approved request already exists for this credential."

    request_id = str(uuid.uuid4())

    cursor.execute("""
    INSERT INTO server_password_change_requests (
        request_id,
        vault_id,
        requested_by,
        reason,
        status
    )
    VALUES (?, ?, ?, ?, 'pending')
    """, (
        request_id,
        vault_id,
        users_id,
        reason
    ))

    connection.commit()
    connection.close()

    request_data = get_request_by_id(request_id)

    return request_data, None


def get_server_password_change_requests(users_id):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
    SELECT role
    FROM users
    WHERE users_id = ?
    """, (users_id,))

    user = cursor.fetchone()

    if user is None:
        connection.close()
        return None

    if user["role"] == "super_admin":
        cursor.execute("""
        SELECT
            r.request_id,
            r.vault_id,
            r.requested_by,
            r.reason,
            r.status,
            r.reviewed_by,
            r.review_note,
            r.created_at,
            r.reviewed_at,
            r.completed_at,
            v.host_name,
            v.credential_type,
            u.full_name AS requested_by_name,
            u.email AS requested_by_email
        FROM server_password_change_requests r
        JOIN vault_items v ON r.vault_id = v.vault_id
        JOIN users u ON r.requested_by = u.users_id
        WHERE r.status IN ('pending', 'approved')
        ORDER BY r.created_at DESC
        """)
    else:
        cursor.execute("""
        SELECT
            r.request_id,
            r.vault_id,
            r.requested_by,
            r.reason,
            r.status,
            r.reviewed_by,
            r.review_note,
            r.created_at,
            r.reviewed_at,
            r.completed_at,
            v.host_name,
            v.credential_type,
            u.full_name AS requested_by_name,
            u.email AS requested_by_email
        FROM server_password_change_requests r
        JOIN vault_items v ON r.vault_id = v.vault_id
        JOIN users u ON r.requested_by = u.users_id
        WHERE r.requested_by = ?
        ORDER BY r.created_at DESC
        """, (users_id,))

    rows = cursor.fetchall()
    connection.close()

    requests = []

    for row in rows:
        requests.append(dict(row))

    return requests


def review_server_password_change_request(super_admin_id, request_id, decision, review_note):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
    SELECT role
    FROM users
    WHERE users_id = ?
    """, (super_admin_id,))

    reviewer = cursor.fetchone()

    if reviewer is None:
        connection.close()
        return False, "Super Admin not found."

    if reviewer["role"] != "super_admin":
        connection.close()
        return False, "Only Super Admin can review server password change requests."

    if decision not in ["approved", "rejected"]:
        connection.close()
        return False, "Decision must be approved or rejected."

    cursor.execute("""
    SELECT request_id, status
    FROM server_password_change_requests
    WHERE request_id = ?
    """, (request_id,))

    request_row = cursor.fetchone()

    if request_row is None:
        connection.close()
        return False, "Request not found."

    if request_row["status"] != "pending":
        connection.close()
        return False, "Only pending requests can be reviewed."

    cursor.execute("""
    UPDATE server_password_change_requests
    SET
        status = ?,
        reviewed_by = ?,
        review_note = ?,
        reviewed_at = CURRENT_TIMESTAMP
    WHERE request_id = ?
    """, (
        decision,
        super_admin_id,
        review_note,
        request_id
    ))

    connection.commit()
    connection.close()

    return True, "Request " + decision + "."


def change_vault_password_after_approval(users_id, vault_id, new_password):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
    SELECT request_id
    FROM server_password_change_requests
    WHERE vault_id = ?
    AND requested_by = ?
    AND status = 'approved'
    ORDER BY reviewed_at DESC
    LIMIT 1
    """, (vault_id, users_id))

    request_row = cursor.fetchone()

    if request_row is None:
        connection.close()
        return False, "Super Admin approval is required before changing this server password."

    cursor.execute("""
    SELECT vault_id
    FROM vault_items
    WHERE vault_id = ?
    AND users_id = ?
    """, (vault_id, users_id))

    vault_item = cursor.fetchone()

    if vault_item is None:
        connection.close()
        return False, "Vault item not found or not owned by this user."

    encrypted = encrypt_password(new_password)

    cursor.execute("""
    UPDATE vault_items
    SET
        encrypted_data = ?,
        nonce = ?,
        auth_tag = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE vault_id = ?
    AND users_id = ?
    """, (
        encrypted["encrypted_data"],
        encrypted["nonce"],
        encrypted["auth_tag"],
        vault_id,
        users_id
    ))

    cursor.execute("""
    UPDATE server_password_change_requests
    SET
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP
    WHERE request_id = ?
    """, (request_row["request_id"],))

    connection.commit()
    connection.close()

    return True, "Server password changed successfully."