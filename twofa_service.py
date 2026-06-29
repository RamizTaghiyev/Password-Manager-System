import io
import base64
import hashlib
import pyotp
import qrcode


def create_secret():
    secret = pyotp.random_base32()
    return secret


def create_qr_setup(secret, user_email, issuer="PasswordManager"):
    totp = pyotp.TOTP(
        secret,
        digits=6,
        interval=30,
        digest=hashlib.sha1
    )

    otp_uri = totp.provisioning_uri(
        name=user_email,
        issuer_name=issuer
    )

    qr = qrcode.make(otp_uri)

    buffer = io.BytesIO()
    qr.save(buffer, format="PNG")

    qr_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    qr_data_url = f"data:image/png;base64,{qr_base64}"

    return otp_uri, qr_data_url


def verify_totp(secret, code):
    totp = pyotp.TOTP(
        secret,
        digits=6,
        interval=30,
        digest=hashlib.sha1
    )

    result = totp.verify(code, valid_window=1)

    return result