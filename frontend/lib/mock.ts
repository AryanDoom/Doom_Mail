import type { Email } from "./types";


const RECIPIENTS = [
  "m.chen@lanternworks.io",
  "priya@northgate.dev",
  "hello@quietfold.co",
  "sam.okonkwo@meridianlabs.com",
  "juno@paperkite.studio",
  "d.almeida@tidalgrid.net",
  "rhea@brambleandco.com",
  "kai.sorensen@fjordhq.no",
  "contact@lowtide.press",
  "ines@veldt-collective.com",
  "noah.feld@atlasgrove.ai",
  "tessa@makersunion.org",
  "owen@clearwater.systems",
  "yuki@stillwater.jp",
  "beatriz@campovert.com.br",
  "lukas@grauwerk.de",
  "aisha@driftwood.agency",
  "petra@northlight.fi",
  "dev@hollowpine.dev",
  "camille@atelierrive.fr",
  "marcus@ironwood.build",
  "elin@skagerrak.se",
  "farid@cobaltline.ae",
  "nora@wildflower.design",
  "tobias@granitepath.ch",
  "mirela@cobaltroads.ro",
  "arjun@saltspring.in",
  "leonie@halcyon.be",
  "santiago@mesaboreal.cl",
  "hana@stillpoint.cz",
  "idris@copperline.ng",
  "freya@ashgrove.im",
  "tomas@quietdunes.pt",
  "ana@piedrafria.es",
  "kenji@oboro.jp",
  "dara@moraine.ie",
  "victor@steel Harbour.co",
  "runa@northwater.is",
  "amara@kilnhouse.ke",
  "nils@saltmarsh.dk",
];

const SUBJECTS = [
  "Quick question about your API",
  "Following up on last week",
  "Scheduling a quick call",
  "Integration between two systems",
  "A small bug we hit in production",
  "Reaching out about the docs",
  "Thought this might be useful for you",
  "Question about your rate limits",
  "Quick intro, no pitch",
  "Feedback on the new release",
  "Possible collaboration",
  "Second attempt at this email",
  "Your post on local-first sync",
  "Help with a deployment issue",
  "Data export question",
  "Webhook retries behaving oddly",
  "A benchmark you might find useful",
  "Design question on your dashboard",
  "Migration from the old endpoint",
  "Trying to reach the docs team",
  "Late reply, apologies for the delay",
  "Pricing for a small team",
  "Onboarding new developers here",
  "Feedback request, 5 minutes",
  "Bug: timezone off by one hour",
  "Can we talk auth properly",
];

// 18 of the 31 sent rows get a pixel hit, the other 13 do not. matches show.py where
// opened only counts status "sent" AND seen
const SENT_COUNT = 31;
const OPENED_COUNT = 18;
const FAILED_COUNT = 4;
const PENDING_COUNT = 7;

const FAILURES = [
  "SMTPAuthenticationError: (535) b'Email not accepted. Invalid credentials.'",
  "SMTPRecipientsRefused: {mailbox does not exist} (in reply to RCPT TO)",
  "SMTPException: (550) relay denied for recipient bounce@corp-internal.example.net via mail.corp-internal.example.net [10.4.22.9], token=Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MGFiY2RlZg==",
  "SMTPServerDisconnected: Connection unexpectedly closed",
];

/** deterministic so the same numbers come back on every reload, no hydration surprises */
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function uuid(seed: number): string {
  const hex = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < 32; i++) {
    if (i === 8 || i === 12 || i === 16 || i === 20) out += "-";
    const chunk = Math.floor(noise(seed + i * 7.3) * 16);
    out += hex[chunk];
  }
  return out;
}

function build(): Email[] {
  const emails: Email[] = [];
  const base = Date.UTC(2026, 8, 29, 10, 42, 0);

  const push = (email: Email) => emails.push(email);

  for (let i = 0; i < SENT_COUNT; i++) {
    const opened = i < OPENED_COUNT;
    // spread sends over the two days before the 29th so the sent dates are not all equal
    const sentOffset = Math.floor(noise(i * 3.1) * 60 * 60 * 46);
    const sentAt = new Date(base - sentOffset).toISOString();

    // an opened email gets between 1 and 6 hits, the first a bit after the send
    const openCount = opened ? 1 + Math.floor(noise(i * 5.7) * 6) : 0;
    const firstOpenOffset = sentOffset + (25 + Math.floor(noise(i * 2.3) * 180)) * 60 * 1000;
    const seenAt = opened ? new Date(base - firstOpenOffset).toISOString() : null;

    push({
      id: uuid(i + 1),
      to: RECIPIENTS[i % RECIPIENTS.length],
      subject: SUBJECTS[i % SUBJECTS.length],
      status: "sent",
      createdAt: new Date(new Date(sentAt).getTime() - 4000).toISOString(),
      sentAt,
      seen: opened,
      seenAt,
      openCount,
      error: null,
    });
  }

  for (let i = 0; i < FAILED_COUNT; i++) {
    const offset =
      i === 0 ? 6 * 60 * 1000 : Math.floor(noise((i + 50) * 2.9) * 60 * 60 * 13) + 40 * 60 * 1000;
    const created = new Date(base - offset);
    push({
      id: uuid(i + 200),
      to: RECIPIENTS[(i + SENT_COUNT) % RECIPIENTS.length],
      subject: SUBJECTS[(i + 9) % SUBJECTS.length],
      status: "failed",
      createdAt: created.toISOString(),
      sentAt: null,
      seen: false,
      seenAt: null,
      openCount: 0,
      error: FAILURES[i],
    });
  }

  for (let i = 0; i < PENDING_COUNT; i++) {
    // a batch that is still going out, so these are the most recent documents
    const offset = Math.floor(noise((i + 90) * 4.4) * 60 * 60 * 7);
    push({
      id: uuid(i + 400),
      to: RECIPIENTS[(i + SENT_COUNT + FAILED_COUNT) % RECIPIENTS.length],
      subject: SUBJECTS[(i + 14) % SUBJECTS.length],
      status: "pending",
      createdAt: new Date(base - offset).toISOString(),
      sentAt: null,
      seen: false,
      seenAt: null,
      openCount: 0,
      error: null,
    });
  }

  return emails;
}

export const SAMPLE_EMAILS: Email[] = build();