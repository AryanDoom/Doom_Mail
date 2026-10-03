# one doc per email, goes in before the email does (status pending) and then moves to
# sent or failed after. that order is on purpose, if the process dies mid send theres
# still a doc and show.py can report it as pending instead of pretending it never existed
#
#   {
#     _id:         uuid4 string, also the id in the beacon url
#     to:          who it went to
#     subject:     subject line
#     status:      "pending" | "sent" | "failed"
#     created_at:  utc datetime
#     sent_at:     utc datetime or null
#     seen:        bool, the worker sets this when the pixel gets hit
#     seen_at:     utc datetime or null
#     open_count:  int, worker bumps this once per hit
#     error:       why it failed or null
#   }
#
# seen / seen_at / open_count are only ever written by the worker, never from here

import uuid
from datetime import datetime, timezone

from pymongo.collection import Collection


def new_email_id() -> str:
    # fresh id for one email, this is also what the worker looks the doc up by
    return str(uuid.uuid4())


def now() -> datetime:
    # always utc so the docs sort right no matter what region mongo is in
    return datetime.now(timezone.utc)


def create_pending(col: Collection, email_id: str, to_addr: str, subject: str) -> None:
    # the about to send doc, this one goes in before sendmail()
    col.insert_one(
        {
            "_id": email_id,
            "to": to_addr,
            "subject": subject,
            "status": "pending",
            "created_at": now(),
            "sent_at": None,
            "seen": False,
            "seen_at": None,
            "open_count": 0,
            "error": None,
        }
    )


def mark_sent(col: Collection, email_id: str) -> None:
    # it sent
    col.update_one(
        {"_id": email_id},
        {"$set": {"status": "sent", "sent_at": now()}},
    )


def mark_failed(col: Collection, email_id: str, message: str) -> None:
    # sendmail threw, keeping the message so show.py can print why
    col.update_one(
        {"_id": email_id},
        {"$set": {"status": "failed", "error": message}},
    )
