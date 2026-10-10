import { PendingEndpoint } from "@/components/PendingEndpoint";

export default function ContactsPage() {
  return (
    <PendingEndpoint title="Contacts">
      Batch sending reads contacts from{" "}
      <code className="font-mono text-[13px] text-ink/70">localstuff/contacts.csv</code> and
      sends one message per valid row. The Compose page sends individual messages through the
      connected API. Contact rows stay in the CSV rather than being stored in MongoDB.
    </PendingEndpoint>
  );
}
