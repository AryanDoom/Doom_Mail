# prints the send totals thats in mongo right now
#
#   python show.py
#
# this never writes anything, only reads. five count_documents is easier to follow
# (and easier to trust) than one aggregation pipeline and at this scale the speed
# difference doesnt matter

from db import connect


def main():
    client, col = connect()
    try:
        sent = col.count_documents({"status": "sent"})
        opened = col.count_documents({"status": "sent", "seen": True})
        failed = col.count_documents({"status": "failed"})
        pending = col.count_documents({"status": "pending"})
        unopened = sent - opened
        open_rate = (opened / sent * 100) if sent else 0.0

        print("Emails Sent     =", sent)
        print("Emails Opened   =", opened)
        print("Emails Unopened =", unopened)
        print("Emails Failed   =", failed)
        print("Emails Pending  =", pending)
        print(f"Open Rate       = {open_rate:.1f}%")
        print()
        print("Note: an 'open' means the tracking image was requested by whatever")
        print("loaded it (mail client, image proxy, or link scanner). It is not proof")
        print("that a person read the email.")
    finally:
        client.close()


if __name__ == "__main__":
    main()
