# sends a batch of emails thru gmail and writes down what happened to each one

import csv
import os
import smtplib

from db import connect
from tracking import create_pending, mark_failed, mark_sent, new_email_id
from mailer import (
    APP_PASSWORD,
    BEACON_URL,
    GMAIL_ADDRESS,
    build_message,
    connect_to_gmail,
    has_crlf,
    looks_like_email,
)

# beacon url comes from mailer and reads .env

CONTACTS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "contacts.csv")


def load_contacts(path: str) -> list[tuple[str, str, str]]:
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

            if has_crlf(subject):
                print(f"Skipping line {line_no}: subject contains CR/LF")
                continue

            if not body:
                print(f"Skipping line {line_no}: no body for {to_addr}")
                continue

            contacts.append((to_addr, subject, body))

    return contacts


def send_batch(server, col, contacts: list[tuple[str, str, str]]) -> tuple[int, int]:
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
        # this batch can't continue, and the mongo uri must stay out of errors
        print("ERROR:", type(e).__name__, e)
    finally:
        client.close()


if __name__ == "__main__":
    main()
