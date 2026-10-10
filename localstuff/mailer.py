# shared mail sending for the api and cli
import html
import os
import re
import smtplib
from email.mime.text import MIMEText

GMAIL_ADDRESS = os.getenv('GMAIL_USER', '')
APP_PASSWORD = os.getenv('GMAIL_PASSWORD', '')
BEACON_URL = os.getenv('BEACON_URL', 'https://coldmail-tracker.aryan161007.workers.dev?id=')
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')

def looks_like_email(value: str) -> bool:
    v = (value or '').strip()
    return bool(EMAIL_RE.match(v))

def has_crlf(s: str) -> bool:
    if not s:
        return False
    return '\r' in s or '\n' in s

def build_message(to: str, subject: str, body: str, email_id: str) -> str:
    beacon = BEACON_URL + email_id
    body_escaped = html.escape(body)
    html_body = '<html><body><p>' + body_escaped + '</p><img src=\"' + beacon + '\" width=\"1\" height=\"1\" alt=\"\"></body></html>'
    msg = MIMEText(html_body, 'html', 'utf-8')
    msg['From'] = GMAIL_ADDRESS
    msg['To'] = to
    msg['Subject'] = subject
    return msg.as_string()

def connect_to_gmail():
    server = None
    try:
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=15)
        server.login(GMAIL_ADDRESS, APP_PASSWORD)
        return server
    except Exception as e:
        print('ERROR: could not connect to Gmail:', type(e).__name__, e)
        if server is not None:
            server.close()
        return None
