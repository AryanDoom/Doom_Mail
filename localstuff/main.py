# sends a batch of emails thru gmail and writes down what happened to each one
#
#   contacts.csv    who to email (to, subject, body)
#   main.py         builds each email, sends it, records the result
#   tracking.py     one mongo doc per email
#   db.py           owns the mongo connection
#   show.py         prints sent / opened / failed totals
#
# every email also gets a hidden 1x1 img pointing at the worker in
# ../cloudflare_stuff/index.js, when that gets requested the worker sets seen to true
# and bumps open_count for the matching email. an open only proves something loaded the
# img tho, could be the mail client or an image proxy or a link scanner, so treat it as
# a weak signal not proof anyone actually read it
#
# one row per person in the csv and one failure never stops the rest of the batch

import csv
import html
import os
import smtplib
from email.mime.text import MIMEText

from db import connect
from tracking import create_pending, mark_failed, mark_sent, new_email_id

# both of these need to be in the env (or localstuff/.env) before running
GMAIL_ADDRESS = os.getenv("GMAIL_USER", "")
APP_PASSWORD = os.getenv("GMAIL_PASSWORD", "")

CONTACTS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "contacts.csv")

# the deployed worker, it takes ?id=<uuid>, hands back a 1x1 gif and records the open
BEACON_URL = "https://cloudflare-yay.astondsouza369.workers.dev?id="


def looks_like_email(value: str) -> bool:
    # super cheap check, theres an @ and a dotted domain after it
    return "@" in value and "." in value.split("@")[-1]


def build_message(to: str, subject: str, body: str, email_id: str) -> str:
    # builds one email as a mime string
    # body comes out of the csv as plain text so it gets escaped before going into the
    # html, otherwise a stray < or & would mess up the markup
    # email_id rides along in the beacon url and thats how the worker finds the right doc
    beacon = BEACON_URL + email_id

    # utf-8 explicitly so curly quotes or emoji in a body dont blow up when it serializes
    html_body = f"""\
<html>
<body>
    <p>{html.escape(body)}</p>
    <img src="{beacon}" width="1" height="1" alt="">
</body>
</html>"""

    msg = MIMEText(html_body, "html", "utf-8")
    msg["From"] = GMAIL_ADDRESS
    msg["To"] = to
    msg["Subject"] = subject
    return msg.as_string()


def load_contacts(path: str) -> list[tuple[str, str, str]]:
    # reads the csv into (to, subject, body) and skips the bad rows
    # every skip prints the line number so a typo in the csv is easy to find
    # instead of just silently dropping someone
    contacts: list[tuple[str, str, str]] = []

    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for line_no, row in enumerate(reader, start=2):
            to_addr = (row.get("to") or "").strip()
            subject = (row.get("subject") or "").strip()
            body = (row.get("body") or "").strip()

            if not to_addr and not body:
                continue

            if not to_addr:
                print(f"Skipping line {line_no}: no 'to' address")
                continue

            if not looks_like_email(to_addr):
                print(f"Skipping line {line_no}: '{to_addr}' is not a valid address")
                continue

            if not body:
                print(f"Skipping line {line_no}: no body for {to_addr}")
                continue

            contacts.append((to_addr, subject, body))

    return contacts


def connect_to_gmail() -> smtplib.SMTP_SSL | None:
    # opens and logs into smtp, or gives back None if that fails
    # connecting and logging in get checked together on purpose, no point sending
    # anything if we cant even get past login
    server = None
    try:
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15)
        server.login(GMAIL_ADDRESS, APP_PASSWORD)
        return server
    except Exception as e:
        print("ERROR: could not connect to Gmail:", type(e).__name__, e)
        if server is not None:
            server.close()
        return None


def send_batch(server, col, contacts: list[tuple[str, str, str]]) -> tuple[int, int]:
    # sends every contact in order, gives back (sent, failed)
    # the pending doc goes in before the send so an email that goes out and then
    # crashes the process still leaves a trace
    sent = 0
    failed = 0
    total = len(contacts)

    for i, (to_addr, subj, body) in enumerate(contacts, start=1):
        email_id = new_email_id()

        try:
            create_pending(col, email_id, to_addr, subj)
            server.sendmail(GMAIL_ADDRESS, to_addr, build_message(to_addr, subj, body, email_id))
            mark_sent(col, email_id)
        except Exception as e:
            failed += 1
            print(f"[{i}/{total}] {to_addr} -> failed: {type(e).__name__}: {e}")
            try:
                mark_failed(col, email_id, f"{type(e).__name__}: {e}")
            except Exception as db_err:
                print(f"    could not record the failure for {to_addr}: {db_err}")
            continue

        sent += 1
        print(f"[{i}/{total}] {to_addr} -> sent")

    return sent, failed


def main():
    # loads the csv and sends it, bails out early on any setup problem
    if not GMAIL_ADDRESS or not APP_PASSWORD:
        print("ERROR: GMAIL_USER and GMAIL_PASSWORD must be set as environment variables.")
        return

    client, col = connect()
    try:
        contacts = load_contacts(CONTACTS_PATH)
        if not contacts:
            print("No usable contacts found in contacts.csv")
            return

        print(f"Loaded {len(contacts)} contacts.\n")

        server = connect_to_gmail()
        if server is None:
            return

        print("Connected to Gmail.\n")

        try:
            sent, failed = send_batch(server, col, contacts)
        finally:
            server.quit()

        print(f"\nDone\nSent: {sent}\nFailed: {failed}")

    except FileNotFoundError:
        print("ERROR: contacts file not found at", CONTACTS_PATH)
    except Exception as e:
        # anything in here is mongo or filesystem stuff so the batch is done at this point
        # print the type and message only, never the uri
        print("ERROR:", type(e).__name__, e)
    finally:
        client.close()


if __name__ == "__main__":
    main()
