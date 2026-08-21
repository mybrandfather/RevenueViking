const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');

let sentMessage;
nodemailer.createTransport = () => ({ sendMail: async message => { sentMessage = message; } });
const handler = require('../api/contact');

function response() {
  return {
    statusCode: 200, headers: {},
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.body = value ? JSON.parse(value) : null; return this; }
  };
}

async function request(method, body = {}, ip = Math.random().toString()) {
  const res = response();
  await handler({ method, body, headers: { 'x-forwarded-for': ip }, socket: {} }, res);
  return res;
}

(async () => {
  assert.equal((await request('GET')).statusCode, 405);
  assert.equal((await request('POST', {})).statusCode, 400);
  assert.equal((await request('POST', { company_website_hp: 'spam' })).statusCode, 200);
  const valid = {
    name: 'Alex Owner', businessName: 'North Star HVAC', email: 'alex@example.com',
    phone: '860-555-0100', website: 'example.com', industry: 'HVAC', callVolume: '10–25',
    message: 'We need better intake when technicians cannot answer.', formType: 'demo',
    source: '/book-demo.html', form_started_at: Date.now() - 5000
  };
  assert.equal((await request('POST', valid)).statusCode, 503);
  Object.assign(process.env, {
    SMTP_HOST: 'smtp.example.com', SMTP_PORT: '465', SMTP_USER: 'hello@example.com',
    SMTP_PASSWORD: 'test-only', SMTP_FROM_EMAIL: 'hello@example.com',
    CONTACT_TO_EMAIL: 'hello@revenueviking.com'
  });
  const success = await request('POST', valid);
  assert.equal(success.statusCode, 200);
  assert.equal(success.body.ok, true);
  assert.equal(sentMessage.to, 'hello@revenueviking.com');
  assert.equal(sentMessage.replyTo, 'alex@example.com');
  assert.match(sentMessage.subject, /North Star HVAC/);
  assert.doesNotMatch(sentMessage.html, /<script/i);
  console.log('Contact endpoint smoke tests passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
