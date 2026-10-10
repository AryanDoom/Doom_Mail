import { PendingEndpoint } from "@/components/PendingEndpoint";

export default function CampaignsPage() {
  return (
    <PendingEndpoint title="Campaigns">
      Email sending uses the API. MongoDB stores each email on its own, without a campaign ID,
      so the dashboard can show email activity but cannot group messages into campaigns yet.
      Open counts come from the Cloudflare Worker when its MongoDB settings are configured.
    </PendingEndpoint>
  );
}
