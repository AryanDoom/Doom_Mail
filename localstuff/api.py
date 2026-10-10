# api for the frontend email screens
from __future__ import annotations

import os
import sys
import json
from urllib.request import Request as UrlRequest, urlopen
from pathlib import Path
from typing import Optional, Union

# let imports work when the api starts from another directory
THIS_DIR = Path(__file__).parent
if str(THIS_DIR) not in sys.path:
    sys.path.insert(0, str(THIS_DIR))

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator, Field

from db import connect
from tracking import create_pending, mark_failed, mark_sent, new_email_id
from mailer import (
    APP_PASSWORD,
    GMAIL_ADDRESS,
    build_message,
    connect_to_gmail,
    has_crlf,
    looks_like_email,
)

app = FastAPI(title="Coldmail API", version="0.1.0")


# allow the local frontend to call this api
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class SendEmailRequest(BaseModel):
    to: str
    subject: str = Field(default="")
    body: str

    @field_validator("to")
    @classmethod
    def _validate_to(cls, v: str) -> str:
        to = (v or "").strip()
        if not to:
            raise ValueError("recipient is required")
        if has_crlf(to):
            raise ValueError("invalid recipient")
        if not looks_like_email(to):
            raise ValueError("invalid recipient")
        return to

    @field_validator("subject")
    @classmethod
    def _validate_subject(cls, v: str) -> str:
        subj = v or ""
        if has_crlf(subj):
            raise ValueError("invalid subject")
        return subj

    @field_validator("body")
    @classmethod
    def _validate_body(cls, v: str) -> str:
        body = v or ""
        if not body.strip():
            raise ValueError("body is required")
        return body


def _doc_to_api(doc: dict) -> dict:
    def iso_z(dt):
        if dt is None:
            return None
        try:
            return dt.isoformat().replace("+00:00", "Z")
        except Exception:
            return None

    return {
        "id": doc.get("_id"),
        "_id": doc.get("_id"),
        "to": doc.get("to"),
        "subject": doc.get("subject", ""),
        "status": doc.get("status"),
        "createdAt": iso_z(doc.get("created_at")),
        "created_at": iso_z(doc.get("created_at")),
        "sentAt": iso_z(doc.get("sent_at")),
        "sent_at": iso_z(doc.get("sent_at")),
        "seen": doc.get("seen", False),
        "seenAt": iso_z(doc.get("seen_at")),
        "seen_at": iso_z(doc.get("seen_at")),
        "openCount": doc.get("open_count", 0),
        "open_count": doc.get("open_count", 0),
        "error": doc.get("error"),
    }


def _merge_open_events(emails: list[dict]) -> list[dict]:
    worker = os.getenv("TRACKER_WORKER_URL", "https://coldmail-tracker.aryan161007.workers.dev").rstrip("/")
    ids = [email.get("id") for email in emails if email.get("id")]
    if not ids:
        return emails

    events = {}
    try:
        for start in range(0, len(ids), 500):
            request = UrlRequest(
                f"{worker}/_events",
                data=json.dumps({"ids": ids[start:start + 500]}).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "coldmail-api/0.1",
                },
                method="POST",
            )
            with urlopen(request, timeout=3) as response:
                batch = json.loads(response.read())
            if not isinstance(batch, dict):
                return emails
            events.update(batch)
    except Exception:
        return emails

    for email in emails:
        event = events.get(email.get("id"))
        if event:
            email["seen"] = True
            email["seenAt"] = event.get("seen_at")
            email["seen_at"] = event.get("seen_at")
            email["openCount"] = event.get("open_count", 0)
            email["open_count"] = event.get("open_count", 0)
    return emails


@app.get("/emails")
def list_emails():
    try:
        client, col = connect()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB connection failed: {type(e).__name__}")
    try:
        cursor = col.find({}).sort("created_at", -1)
        docs = list(cursor)
        return _merge_open_events([_doc_to_api(d) for d in docs])
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch emails")
    finally:
        try:
            client.close()
        except Exception:
            pass


@app.get("/emails/{email_id}")
def get_email(email_id: str):
    if has_crlf(email_id):
        raise HTTPException(status_code=400, detail="invalid id")
    try:
        client, col = connect()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB connection failed: {type(e).__name__}")
    try:
        doc = col.find_one({"_id": email_id})
        if not doc:
            raise HTTPException(status_code=404, detail="not found")
        return _merge_open_events([_doc_to_api(doc)])[0]
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch email")
    finally:
        try:
            client.close()
        except Exception:
            pass


@app.post("/emails", status_code=201)
def send_email(req: SendEmailRequest):
    if not GMAIL_ADDRESS or not APP_PASSWORD:
        raise HTTPException(status_code=500, detail="GMAIL_USER/GMAIL_PASSWORD not configured")

    to_addr = req.to
    subject = req.subject
    body = req.body

    try:
        client, col = connect()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB connection failed: {type(e).__name__}")
    email_id = new_email_id()
    try:
        create_pending(col, email_id, to_addr, subject)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to create tracking record")

    server = None
    try:
        server = connect_to_gmail()
        if server is None:
            try:
                mark_failed(col, email_id, "Failed to connect to Gmail SMTP")
                doc = col.find_one({"_id": email_id})
            except Exception:
                doc = None
            return JSONResponse(status_code=500, content=_doc_to_api(doc) if doc else {"error": "send failed"})
        server.sendmail(GMAIL_ADDRESS, to_addr, build_message(to_addr, subject, body, email_id))
        mark_sent(col, email_id)
        doc = col.find_one({"_id": email_id})
        return JSONResponse(status_code=201, content=_doc_to_api(doc) if doc else {})
    except Exception as e:
        try:
            mark_failed(col, email_id, f"{type(e).__name__}: {str(e)}")
        except Exception:
            pass
        try:
            doc = col.find_one({"_id": email_id})
        except Exception:
            doc = None
        return JSONResponse(status_code=500, content=_doc_to_api(doc) if doc else {"error": "send failed"})
    finally:
        if server is not None:
            try:
                server.quit()
            except Exception:
                pass
        try:
            client.close()
        except Exception:
            pass


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": "internal server error"})
