const baseUrl = process.argv[2] ?? 'https://www.maiatesta.com';
const url = new URL('/api/meta/health', baseUrl).toString();

let hasFailure = false;

function fail(message) {
  hasFailure = true;
  console.error(`FAIL: ${message}`);
}

async function fetchHealth() {
  const response = await fetch(url, { cache: 'no-store' });
  const body = await response.json();
  return { response, body };
}

const first = await fetchHealth();

if (first.response.status !== 200) {
  fail(`expected status 200, got ${first.response.status}`);
}

const contentType = first.response.headers.get('content-type') ?? '';
if (!contentType.includes('application/json')) {
  fail(`expected content-type to include application/json, got "${contentType}"`);
}

if (first.body.ok !== true) {
  fail(`expected body.ok === true, got ${JSON.stringify(first.body.ok)}`);
}

if (first.body.service !== 'maiatesta-meta-backend') {
  fail(`expected body.service === "maiatesta-meta-backend", got ${JSON.stringify(first.body.service)}`);
}

if (typeof first.body.timestamp === 'string') {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const second = await fetchHealth();

  if (second.body.timestamp === first.body.timestamp) {
    fail('timestamp did not change between two requests — response may be statically cached, not dynamically generated');
  }
}

if (hasFailure) {
  process.exit(1);
}

console.log(`Meta health check OK: ${url} returned a real, dynamic 200 JSON response.`);
