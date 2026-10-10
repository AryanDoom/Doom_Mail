import { PendingEndpoint } from "@/components/PendingEndpoint";

export default function SettingsPage() {
  return (
    <PendingEndpoint title="Settings">
      Email sending reads Gmail and MongoDB settings from the Python API environment. For local
      use, edit <code className="font-mono text-[13px] text-ink/70">localstuff/.env</code> and
      restart the API. Open tracking uses separate MongoDB settings on the Cloudflare Worker.
      Secret values stay on the backend and are never sent to this page.
    </PendingEndpoint>
  );
}
