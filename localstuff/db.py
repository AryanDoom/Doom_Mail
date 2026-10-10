
import os
from urllib.parse import quote

from dotenv_vault import load_dotenv

from pymongo import MongoClient
from pymongo.collection import Collection

# load .env when present; shell vars still work without it
try:
    load_dotenv()
except FileNotFoundError:
    pass

DB_NAME = "mailey"
COLL_NAME = "mails"


def connect() -> tuple[MongoClient, Collection]:
    user = os.getenv("MONGODB_USER", "")
    password = os.getenv("MONGODB_PASSWORD", "")
    db_host = os.getenv("MONGODB_HOST", os.getenv("MONGO_HOST", "example-cluster.mongodb.net"))

    if not user or not password:
        raise RuntimeError(
            "MONGODB_USER and MONGODB_PASSWORD must be set as environment "
            "variables before running this."
        )

    uri = (
        "mongodb+srv://"
        + quote(user, safe="")
        + ":"
        + quote(password, safe="")
        + "@"
        + db_host
        + "/?appName=test"
    )

    client = MongoClient(uri, serverSelectionTimeoutMS=10000, tz_aware=True)
    return client, client.get_database(DB_NAME)[COLL_NAME]
