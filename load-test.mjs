import { performance } from "node:perf_hooks";

const baseUrl = process.env.API_URL || "http://localhost:4000";
const concurrency = Number(process.env.CONCURRENT || 100);
const runId = process.env.RUN_ID || `demo-load-${Date.now()}`;
let next = 0;
let duplicates = 0;
let errors = 0;
let created = 0;

const keys = Array.from({ length: 100000 }, (_, i) =>
  i < 80000
    ? `${runId}-unique-${i}`
    : `${runId}-unique-${i - 80000}`
);

const start = performance.now();
async function worker() {
  while (true) {
    const index = next++;
    if (index >= keys.length) return;
    try {
      const response = await fetch(`${baseUrl}/submissions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          form_id: "contact-form",
          idempotency_key: keys[index],
          email: "load@example.com",
          data: { name: "Load", index }
        })
      });
      const body = await response.json();
      if (body.isDuplicate) duplicates++;
      else if (response.ok) created++;
      else errors++;
    } catch {
      errors++;
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));
const seconds = (performance.now() - start) / 1000;
console.log(JSON.stringify({
  runId,
  requests: 100000,
  stored: created,
  duplicates,
  errors,
  throughputRps: Math.round(100000 / seconds)
}, null, 2));
