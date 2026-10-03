// this is the tracking pixel for the emails main.py sends
// every email has a hidden 1x1 img in it pointing at this worker with ?id=<email id>
// when that gets requested we set seen to true and bump open_count on the matching doc
// then hand back a 1x1 gif
//
// two things this file does on purpose:
//   1. always return the gif even if the id is bad or a secret is missing or mongo is down
//      nobody should see a broken image, and a tracker thats broken shouldnt take the
//      email down with it
//   2. never log the uri, the password is in there
//
// DB_HOST / DB_NAME / COLL_NAME below are copies of the ones in localstuff/db.py
// they have to match since both sides open the same db
//
// creds come from worker secrets (wrangler secret put MONGODB_USER) so they show up in env
// process.env is read too in case nodejs_compat is on and they get injected that way instead

import { MongoClient } from "mongodb";

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

// cluster hostname from the atlas connect string, same one as in localstuff/db.py
// keeping it an example so my real project id doesnt end up on github
const DB_HOST = 'example-cluster.mongodb.net';
const DB_NAME = "mailey";
const COLL_NAME = "mails";

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
	async fetch(request, env) {
		const mail_id = new URL(request.url).searchParams.get("id");

		if (!mail_id || !ID_PATTERN.test(mail_id)) {
			return gifResponse();
		}

		const user = env.MONGODB_USER ?? process.env.MONGODB_USER;
		const password = env.MONGODB_PASSWORD ?? process.env.MONGODB_PASSWORD;

		if (!user || !password) {
			console.log("open skipped, MONGODB_USER / MONGODB_PASSWORD are not set");
			return gifResponse();
		}

		// encodeURIComponent because a password with @ : / or # in it would break the uri otherwise
		const uri = 'mongodb+srv://'
			+ encodeURIComponent(user)
			+ ':'
			+ encodeURIComponent(password)
			+ '@'
			+ DB_HOST
			+ '/?appName=test';

		const client = new MongoClient(uri);
		try {
			const mails = client.db(DB_NAME).collection(COLL_NAME);
			const result = await mails.updateOne(
				{ _id: mail_id },
				{ $set: { seen: true, seen_at: new Date() }, $inc: { open_count: 1 } }
			);
			console.log("open", mail_id, "updated:", result.modifiedCount);
		} catch (err) {
			// never log the uri in here, just the message
			console.log("open failed for", mail_id, err.message);
		} finally {
			await client.close();
		}

		return gifResponse();
	},
};
