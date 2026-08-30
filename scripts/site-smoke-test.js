const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const target = path.join(directory, entry.name);
  if (entry.name === 'node_modules' || entry.name === '.git') return [];
  return entry.isDirectory() ? walk(target) : [target];
});
const files = walk(root);
const htmlFiles = files.filter(file => file.endsWith('.html'));
const stale = /(?:whatsapp|wa\.me|18602687732|860[ )-]*268[ -]*7732)/i;

for (const file of files.filter(file => !file.startsWith(__dirname) && /\.(?:html|js|css|txt|json|md)$/i.test(file))) {
  assert.doesNotMatch(fs.readFileSync(file, 'utf8'), stale, `Stale contact reference in ${file}`);
}

const titles = new Map();
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const noindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);
  const rootBase = /<base[^>]+href=["']\/["']/i.test(html);
  assert.match(html, /<title>[^<]+<\/title>/i, `Missing title in ${file}`);
  assert.match(html, /<meta[^>]+name=["']description["'][^>]*>/i, `Missing meta description in ${file}`);
  assert.match(html, /(?:\.\.\/)?js\/app\.js\?v=20260821-contact-fix["']/i, `Unversioned app.js reference in ${file}`);
  if (!noindex) {
    assert.match(html, /<link[^>]+rel=["']canonical["'][^>]*>/i, `Missing canonical in ${file}`);
    assert.match(html, /<link[^>]+href=["']https:\/\/www\.revenueviking\.com\//i, `Canonical must use the live www hostname in ${file}`);
  }

  for (const match of html.matchAll(/<(?:a|link|script|img|source|video)\b[^>]+(?:href|src|poster)=["']([^"'#?]+)["']/gi)) {
    const reference = match[1];
    if (/^(?:https?:|mailto:|tel:|data:|\/\/)/i.test(reference)) continue;
    const target = reference.startsWith('/') || rootBase
      ? path.join(root, reference.replace(/^\/+/, ''))
      : path.resolve(path.dirname(file), reference);
    const normalized = fs.existsSync(target) && fs.statSync(target).isDirectory() ? path.join(target, 'index.html') : target;
    assert.ok(fs.existsSync(normalized), `Broken local reference ${reference} in ${file}`);
  }

  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    assert.doesNotThrow(() => JSON.parse(match[1]), `Invalid JSON-LD in ${file}`);
  }

  if (!noindex) {
    const title = html.match(/<title>([^<]+)<\/title>/i)[1].trim();
    assert.ok(!titles.has(title), `Duplicate indexable title: ${title}`);
    titles.set(title, file);
  }
}

const vercelConfig = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const cacheHeader = source => vercelConfig.headers.find(rule => rule.source === source)?.headers.find(header => header.key === 'Cache-Control')?.value;
assert.equal(cacheHeader('/js/(.*)'), 'public, max-age=0, must-revalidate');
assert.equal(cacheHeader('/css/(.*)'), 'public, max-age=0, must-revalidate');
assert.equal(cacheHeader('/images/(.*)'), 'public, max-age=31536000, immutable');

const appScript = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const successGuard = appScript.indexOf('if (!response.ok || !result.ok)');
const redirect = appScript.indexOf("window.location.assign('thank-you.html')");
assert.ok(successGuard > -1 && redirect > successGuard, 'Thank-you redirect must follow a confirmed API success response');
assert.match(appScript, /catch\s*\{[\s\S]*hello@revenueviking\.com[\s\S]*submitButton\.disabled = false;/);

const foundingPage = fs.readFileSync(path.join(root, 'founding-clients.html'), 'utf8');
assert.match(foundingPage, /<link href="https:\/\/www\.revenueviking\.com\/founding-clients" rel="canonical"/);
assert.match(foundingPage, /\$200[\s\S]*\$97\/month[\s\S]*\$197\/mo/);
assert.match(foundingPage, /name="formType" type="hidden" value="founding-client"/);
for (const field of ['name', 'businessName', 'industry', 'city', 'state', 'phone', 'email', 'callVolume', 'message']) {
  assert.match(foundingPage, new RegExp(`name="${field}"[^>]*required|required[^>]*name="${field}"`), `Required founding field missing: ${field}`);
}
for (const field of ['utmSource', 'utmMedium', 'utmCampaign', 'utmContent', 'utmTerm']) {
  assert.match(foundingPage, new RegExp(`name="${field}"`), `UTM field missing: ${field}`);
}
assert.doesNotMatch(foundingPage, /G-XXXXXXXXXX|fbq\s*\(\s*['"]init['"]|unlimited calls|never miss another call/i);
const termsPage = fs.readFileSync(path.join(root, 'terms-of-service.html'), 'utf8');
assert.match(termsPage, /Regular public pricing is \$500[\s\S]*\$200 setup[\s\S]*\$97 per month[\s\S]*\$197 per month/);
assert.doesNotMatch(termsPage, /founding-client offer is currently \$500/i);
const inlineSuccess = appScript.indexOf("form.dataset.successMode === 'inline'");
const metaLead = appScript.indexOf("window.fbq('track', 'Lead'");
const trackingCall = appScript.indexOf('trackFoundingClientSuccess();');
assert.ok(inlineSuccess > successGuard && trackingCall > successGuard && metaLead > -1, 'Founding conversion hook must run only after confirmed API success');
assert.match(appScript, /new URLSearchParams\(window\.location\.search\)/);
assert.match(appScript, /utm_source[\s\S]*utm_medium[\s\S]*utm_campaign[\s\S]*utm_content[\s\S]*utm_term/);

const foundingRewrite = vercelConfig.rewrites?.find(rule => rule.source === '/founding-clients');
assert.equal(foundingRewrite?.destination, '/founding-clients.html');

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
assert.match(sitemap, /^<\?xml[^>]*>\s*<urlset\b/i, 'Invalid sitemap root');
for (const [, location] of sitemap.matchAll(/<loc>https:\/\/www\.revenueviking\.com\/([^<]*)<\/loc>/g)) {
  let target = location ? path.join(root, location) : path.join(root, 'index.html');
  if (!fs.existsSync(target) && location && !path.extname(location)) target = `${target}.html`;
  assert.ok(fs.existsSync(target), `Sitemap target missing: ${location || '/'}`);
}
assert.doesNotMatch(sitemap, /https:\/\/revenueviking\.com\//, 'Sitemap must not mix apex and www hostnames');

console.log(`Site smoke tests passed across ${htmlFiles.length} HTML files.`);
