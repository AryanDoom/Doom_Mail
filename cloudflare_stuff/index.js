
// real 1x1 transparent gif so nothing renders as a missing image icon
const gif1x1 = [
	0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
	0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
	0x00, 0x00, 0x00, 0xff, 0xff, 0xff,
	0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00,
	0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01,
	0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00,
	0x3b
];

// this is the uuid4 shape tracking.py makes, anything else gets ignored instead of
// queried so some random hit cant reach the db
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// no-store so nothing between the mail client and here reports a stale view
const GIF_HEADERS = {
	"Content-Type": "image/gif",
	"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
	"Pragma": "no-cache",
	"Expires": "Thu, 01 Jan 1970 00:00:00 GMT"
};

/** this is the only response this worker ever sends */
const gifResponse = () => new Response(new Uint8Array(gif1x1), { headers: GIF_HEADERS });

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		if (url.pathname === "/_events" && request.method === "POST") {
			return getOpenEvents(request, env);
		}

		const mail_id = url.searchParams.get("id");

		if (!mail_id || !ID_PATTERN.test(mail_id)) {
			return gifResponse();
		}

		if (!env.OPEN_EVENTS) {
			console.log("open skipped, KV binding is not set");
			return gifResponse();
		}

		ctx.waitUntil(recordOpen(env.OPEN_EVENTS, mail_id));

		return gifResponse();
	},
};

async function getOpenEvents(request, env) {
	if (!env.OPEN_EVENTS) return Response.json({ error: "KV binding is not set" }, { status: 503 });

	let payload;
	try {
		payload = await request.json();
	} catch {
		return Response.json({ error: "invalid request" }, { status: 400 });
	}

	const ids = Array.isArray(payload?.ids) ? payload.ids.slice(0, 500) : [];
	if (ids.some((id) => typeof id !== "string" || !ID_PATTERN.test(id))) {
		return Response.json({ error: "invalid id" }, { status: 400 });
	}

	const values = await Promise.all(ids.map(async (id) => {
		const value = await env.OPEN_EVENTS.get(`open:${id}`, "json");
		return value ? [id, value] : null;
	}));
	return Response.json(Object.fromEntries(values.filter(Boolean)), {
		headers: { "Cache-Control": "no-store" }
	});
}

async function recordOpen(store, mail_id) {
	try {
		const key = `open:${mail_id}`;
		const previous = await store.get(key, "json");
		await store.put(key, JSON.stringify({
			seen: true,
			seen_at: new Date().toISOString(),
			open_count: (previous?.open_count ?? 0) + 1
		}));
		console.log("open recorded", mail_id);
	} catch (err) {
		console.log("open failed for", mail_id, err.message);
	}
}
