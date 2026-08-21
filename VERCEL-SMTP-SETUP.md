# RevenueViking contact-form setup

Add these environment variables in Vercel for Production, Preview and Development:

- `SMTP_HOST`: the exact SMTP hostname shown in Hostinger's email configuration.
- `SMTP_PORT`: `465` for SSL or `587` for STARTTLS, matching Hostinger's configuration.
- `SMTP_USER`: the full authenticated Hostinger mailbox address.
- `SMTP_PASSWORD`: the mailbox or app password. Never commit this value.
- `SMTP_FROM_EMAIL`: an address Hostinger permits the authenticated mailbox to send from.
- `CONTACT_TO_EMAIL`: `hello@revenueviking.com`.

After saving the variables, redeploy the project and submit both forms. Confirm delivery and reply-to behavior before outreach begins.
