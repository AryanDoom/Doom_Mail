# this is the python side of the connection
# the worker in ../cloudflare_stuff/index.js opens its own connection to the same db with
# its own copy of these 3 constants so they have to stay in sync
#
#   DB_HOST   the atlas cluster hostname
#   DB_NAME   the database
#   COLL_NAME the collection, one doc per email
#
# tracking.py makes the docs, the worker is the one that updates them

import os
from urllib.parse import quote

from dotenv_vault import load_dotenv

from pymongo import MongoClient
from pymongo.collection import Collection

# dotenv_vault throws FileNotFoundError when theres no .env which is fine
# the vars can just come from the shell instead
try:
    load_dotenv()
except FileNotFoundError:
    pass

DB_NAME = "mailey"
COLL_NAME = "mails"
DB_HOST = "test.ueiwc3g.mongodb.net"


def connect() -> tuple[MongoClient, Collection]:
    # gives back the client and the mails collection
    # raises if the creds are missing so you get one clear message here
    # instead of some driver error further down
    user = os.getenv("MONGODB_USER", "")
    password = os.getenv("MONGODB_PASSWORD", "")

    if not user or not password:
        raise RuntimeError(
            "MONGODB_USER and MONGODB_PASSWORD must be set as environment "
            "variables before running this."
        )

    # quote(safe="") is percent encoding which is what the userinfo part of a mongo uri wants
    # dont swap this for quote_plus, that turns a space into a + which gets read as a literal plus
    # the worker does the same thing with encodeURIComponent
    uri = (
        "mongodb+srv://"
        + quote(user, safe="")
        + ":"
        + quote(password, safe="")
        + "@"
        + DB_HOST
        + "/?appName=test"
    )

    # never print this uri, the password is in it
    client = MongoClient(uri, serverSelectionTimeoutMS=10000)
    return client, client.get_database(DB_NAME)[COLL_NAME]
