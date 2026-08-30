const nodemailer = require('nodemailer');

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 5;
const attempts = new Map();

const FIELD_LIMITS = {
  name: 100,
  businessName: 140,
  email: 254,
  phone: 40,
  website: 300,
  industry: 100,
  city: 100,
  state: 100,
  callVolume: 100,
  message: 3000,
  source: 300,
  formType: 30,
  utmSource: 200,
  utmMedium: 200,
  utmCampaign: 200,
  utmContent: 200,
  utmTerm: 200
};

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(body));
}

function clean(value, limit) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function rateLimited(ip) {
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter(timestamp => now - timestamp < RATE_WINDOW_MS);
  recent.push(now);
  attempts.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, message: 'Method not allowed.' });
  }

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) {
    return json(res, 429, { ok: false, message: 'Too many requests. Please try again later.' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (clean(body.company_website_hp, 200)) {
    return json(res, 200, { ok: true });
  }

  const startedAt = Number(body.form_started_at);
  const elapsed = Date.now() - startedAt;
  if (!Number.isFinite(startedAt) || elapsed < 2000 || elapsed > 24 * 60 * 60 * 1000) {
    return json(res, 400, { ok: false, message: 'Please refresh the page and try again.' });
  }

  const data = {};
  for (const [field, limit] of Object.entries(FIELD_LIMITS)) data[field] = clean(body[field], limit);

  if (!data.name || !data.businessName || !data.email || !data.message) {
    return json(res, 400, { ok: false, message: 'Please complete all required fields.' });
  }
  if (data.formType === 'founding-client' && (!data.industry || !data.city || !data.state || !data.phone || !data.callVolume)) {
    return json(res, 400, { ok: false, message: 'Please complete all required founding-client application fields.' });
  }
  if (!validEmail(data.email)) {
    return json(res, 400, { ok: false, message: 'Please enter a valid email address.' });
  }
  if (data.phone && (data.phone.match(/\d/g) || []).length < 7) {
    return json(res, 400, { ok: false, message: 'Please enter a valid phone number or leave it blank.' });
  }
  if (data.website) {
    try {
      const url = new URL(data.website.includes('://') ? data.website : `https://${data.website}`);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid protocol');
      data.website = url.toString();
    } catch {
      return json(res, 400, { ok: false, message: 'Please enter a valid business website or leave it blank.' });
    }
  }

  const requiredEnv = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM_EMAIL', 'CONTACT_TO_EMAIL'];
  if (requiredEnv.some(key => !process.env[key])) {
    console.error('[contact] SMTP configuration is incomplete.');
    return json(res, 503, { ok: false, message: 'Email delivery is temporarily unavailable.' });
  }

  const smtpPort = Number(process.env.SMTP_PORT);
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    console.error('[contact] SMTP_PORT is invalid.');
    return json(res, 503, { ok: false, message: 'Email delivery is temporarily unavailable.' });
  }

  const timestamp = new Date().toISOString();
  const isFoundingClient = data.formType === 'founding-client';
  const fields = [
    ['Name', data.name],
    ['Business', data.businessName],
    ['Email', data.email],
    ['Phone', data.phone || 'Not provided'],
    ['Website', data.website || 'Not provided'],
    ['Industry', data.industry || 'Not provided'],
    ['City', data.city || 'Not provided'],
    ['State', data.state || 'Not provided'],
    ['Call Volume', data.callVolume || 'Not provided'],
    ['Message / Main Challenge', data.message],
    ['Form', data.formType || 'contact'],
    ['Page / Source', data.source || 'Not provided'],
    ['UTM Source', data.utmSource || 'Not provided'],
    ['UTM Medium', data.utmMedium || 'Not provided'],
    ['UTM Campaign', data.utmCampaign || 'Not provided'],
    ['UTM Content', data.utmContent || 'Not provided'],
    ['UTM Term', data.utmTerm || 'Not provided'],
    ['Timestamp', timestamp]
  ];
  const textBody = fields.map(([label, value]) => `${label}: ${value}`).join('\n');
  const requestTitle = isFoundingClient ? 'New RevenueViking Founding Client Application' : 'New RevenueViking Demo Request';
  const htmlBody = `<h2>${requestTitle}</h2><table cellpadding="6" cellspacing="0" style="border-collapse:collapse">${fields.map(([label, value]) => `<tr><th align="left" valign="top" style="border-bottom:1px solid #ddd">${escapeHtml(label)}</th><td style="border-bottom:1px solid #ddd">${escapeHtml(value)}</td></tr>`).join('')}</table>`;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      requireTLS: smtpPort === 587,
      tls: { minVersion: 'TLSv1.2' },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000
    });

    const delivery = await transporter.sendMail({
      from: `RevenueViking Website <${process.env.SMTP_FROM_EMAIL}>`,
      to: process.env.CONTACT_TO_EMAIL,
      replyTo: data.email,
      subject: `${isFoundingClient ? 'Founding Client Application' : 'New RevenueViking Demo Request'} — ${data.businessName}`,
      text: textBody,
      html: htmlBody
    });

    const acceptedCount = Array.isArray(delivery?.accepted) ? delivery.accepted.length : 0;
    const rejectedCount = Array.isArray(delivery?.rejected) ? delivery.rejected.length : 0;
    if (acceptedCount < 1 || rejectedCount > 0) {
      console.error('[contact] Message was not accepted by SMTP.', { acceptedCount, rejectedCount });
      return json(res, 502, { ok: false, message: 'We could not send your request right now.' });
    }

    return json(res, 200, { ok: true });
  } catch (error) {
    console.error('[contact] Message delivery failed.', { name: error?.name, code: error?.code });
    return json(res, 502, { ok: false, message: 'We could not send your request right now.' });
  }
};
