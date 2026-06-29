import smtplib
import secrets
import string
from email.message import EmailMessage


SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

SENDER_EMAIL = "ramiztaghiyev26@gmail.com"
SENDER_PASSWORD = "kkjq tmpo ldpg fpux"


def generate_email_code(length=10):
    characters = string.ascii_letters + string.digits + "!@#$%&*"

    code = ""

    for i in range(length):
        code += secrets.choice(characters)

    return code


def send_verification_email(receiver_email, verification_code, purpose):
    message = EmailMessage()

    message["From"] = SENDER_EMAIL
    message["To"] = receiver_email
    message["Subject"] = "Password Manager Verification Code"

    body = f"""
Hello,

Your verification code for {purpose} is:

{verification_code}

Do not share this code with anyone.

Password Manager System
"""

    message.set_content(body)

    server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
    server.starttls()
    server.login(SENDER_EMAIL, SENDER_PASSWORD)
    server.send_message(message)
    server.quit()