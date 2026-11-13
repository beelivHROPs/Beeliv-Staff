// Run: node lib/share/share-urls.check.mjs  (Node 22.6+ strips the types)
import assert from "node:assert/strict";
import { buildShareTargets, canonicalShareUrl, jobShareText } from "./share-urls.ts";

const get = (list, id) => list.find((t) => t.id === id).href;
const p = { title: "Sous Chef & Co at Café Zoë", text: "Sous Chef at Café Zoë, Abuja: apply on Beeliv", url: "https://beeliv.co/jobs/sous-chef" };
const t = buildShareTargets(p);

assert.equal(t.length, 7);
assert.equal(get(t, "whatsapp"), "https://wa.me/?text=" + encodeURIComponent(p.text + " " + p.url));
assert.ok(get(t, "whatsapp").includes("Caf%C3%A9%20Zo%C3%AB")); // non-ASCII and spaces
assert.ok(get(t, "email").startsWith("mailto:?subject=Sous%20Chef%20%26%20Co%20at")); // ampersand escaped
assert.ok(get(t, "sms").startsWith("sms:?&body=")); // intentional "?&" form
assert.ok(get(t, "telegram").includes("url=https%3A%2F%2Fbeeliv.co%2Fjobs%2Fsous-chef&text="));
assert.ok(get(t, "x").includes("&url=https%3A%2F%2Fbeeliv.co"));
for (const x of t) assert.ok(!/\s/.test(x.href), x.id + " has raw whitespace");
const amp = buildShareTargets({ ...p, text: "A&B=C?D" });
assert.ok(get(amp, "whatsapp").includes("A%26B%3DC%3FD"));

assert.equal(canonicalShareUrl("https://beeliv.co/jobs/sous-chef?pilot=1&utm_source=x#top"), "https://beeliv.co/jobs/sous-chef");
assert.equal(canonicalShareUrl("http://192.168.1.5:3000/applicant/jobs/sous-chef?demo=1"), "http://192.168.1.5:3000/jobs/sous-chef");
assert.equal(canonicalShareUrl("https://beeliv.co/jobs/sous-chef/"), "https://beeliv.co/jobs/sous-chef");
assert.equal(jobShareText("Sous Chef", "The Urban Grill", "Abuja"), "Sous Chef at The Urban Grill, Abuja: apply on Beeliv");
console.log("share-urls: all checks passed");
