
import uuid
from datetime import datetime, timezone

from pymongo.collection import Collection


def new_email_id() -> str:
    # fresh id for one email, this is also what the worker uses for the open event
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
