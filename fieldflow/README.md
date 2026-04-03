# FieldFlow

FieldFlow is a field service business platform built for contractors, HVAC technicians, plumbers, electricians, and other trades. It streamlines the entire customer lifecycle — from sending proposals and scheduling jobs to collecting invoices and generating Google reviews — all in one place.

## What FieldFlow Does

- **Proposals** — Create professional, itemized proposals with line items, tax, and optional deposit requirements. Send proposals to customers via a shareable link where they can view and digitally sign.
- **Jobs** — Schedule and dispatch jobs to technicians. Track job status from scheduled through en-route, in-progress, and complete. Attach notes and photos.
- **Invoicing** — Generate invoices from completed jobs. Track payment status, send payment links, and reconcile outstanding balances.
- **Review Requests** — Automatically send Google review request SMS messages to customers a configurable number of hours after a job is marked complete.
- **Appointment Reminders** — Automatically send SMS reminders to customers 24 hours and 1 hour before a scheduled appointment.
- **Playbooks** — Build reusable service playbooks (checklists and SOPs) that technicians can follow in the field.
- **Customer Management** — Full customer history including proposals, jobs, and invoices in one view.
- **Team Management** — Invite and manage team members with owner, admin, and tech roles.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| SMS | Twilio |
| Hosting | Vercel |
| Cron Jobs | Vercel Cron |

---

## Setup Instructions

### 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Wait for the project to finish provisioning.
3. In the left sidebar, click **SQL Editor**.
4. Click **New query**, paste the contents of `supabase/migrations/001_initial_schema.sql`, and click **Run**.
5. Navigate to **Project Settings > API**.
6. Copy your **Project URL** — this is your `NEXT_PUBLIC_SUPABASE_URL`.
7. Under **Project API keys**, copy the `anon` `public` key — this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
8. Copy the `service_role` `secret` key — this is your `SUPABASE_SERVICE_ROLE_KEY`. Keep this secret — never expose it in the browser.

### 2. Twilio Setup

1. Go to [twilio.com](https://twilio.com) and create an account.
2. From the Twilio Console dashboard, note your **Account SID** and **Auth Token** — these are `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`.
3. In the left sidebar, go to **Phone Numbers > Manage > Buy a number**.
4. Purchase a US phone number with SMS capability.
5. Copy the phone number (in E.164 format, e.g. `+15551234567`) — this is your `TWILIO_PHONE_NUMBER`.

### 3. Stripe Setup (Optional)

FieldFlow can optionally collect proposal deposits and invoice payments via Stripe.

1. Go to [stripe.com](https://stripe.com) and create an account.
2. In the Stripe Dashboard, go to **Developers > API keys**.
3. Copy the **Publishable key** — this is `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
4. Copy the **Secret key** — this is `STRIPE_SECRET_KEY`.
5. In **Developers > Webhooks**, click **Add endpoint**.
6. Set the endpoint URL to `https://your-domain.vercel.app/api/webhooks/stripe`.
7. Select the events: `payment_intent.succeeded`, `payment_intent.payment_failed`.
8. After creating the webhook, reveal and copy the **Signing secret** — this is `STRIPE_WEBHOOK_SECRET`.

> If you skip Stripe setup, deposit and payment collection features will be unavailable but all other functionality works normally.

### 4. Local Development

```bash
# Clone the repository
git clone https://github.com/your-username/fieldflow.git

# Enter the project directory
cd fieldflow

# Install dependencies
npm install

# Copy the example environment file
cp .env.example .env.local

# Fill in your environment variables (see table below)
# Then start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Vercel Deployment

1. Push your code to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
3. Click **Add New > Project** and import your repository.
4. Under **Environment Variables**, add all of the variables listed in the table below.
5. Click **Deploy**.
6. After deployment, add `CRON_SECRET` to your Vercel environment variables (generate a random string, e.g. `openssl rand -hex 32`). This secret authenticates the Vercel Cron scheduler when it calls your cron endpoints.
7. The crons defined in `vercel.json` will run automatically on Vercel's infrastructure:
   - Review request SMS: every 30 minutes
   - Appointment reminder SMS: every hour

---

## Environment Variables

| Variable | Description | Where to find it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public API key | Supabase Dashboard > Project Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role secret key (server-only) | Supabase Dashboard > Project Settings > API |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | Twilio Console Dashboard |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | Twilio Console Dashboard |
| `TWILIO_PHONE_NUMBER` | Twilio phone number in E.164 format (e.g. `+15551234567`) | Twilio Console > Phone Numbers |
| `CRON_SECRET` | Secret token used to authenticate Vercel Cron requests | Generate with `openssl rand -hex 32` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (optional) | Stripe Dashboard > Developers > API keys |
| `STRIPE_SECRET_KEY` | Stripe secret key (optional) | Stripe Dashboard > Developers > API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (optional) | Stripe Dashboard > Developers > Webhooks |
| `NEXT_PUBLIC_APP_URL` | Your deployed app URL (e.g. `https://fieldflow.vercel.app`) | Your Vercel deployment URL |

---

## Project Structure

```
fieldflow/
├── app/
│   ├── (auth)/             # Login and signup pages
│   ├── api/
│   │   ├── cron/
│   │   │   ├── review-requests/      # SMS review requests (every 30 min)
│   │   │   └── appointment-reminders/ # SMS reminders (hourly)
│   │   ├── jobs/           # Job API routes
│   │   ├── proposals/      # Proposal API routes
│   │   └── webhooks/       # Stripe webhook handler
│   ├── dashboard/
│   │   ├── customers/      # Customer list and detail pages
│   │   ├── jobs/           # Job management
│   │   ├── proposals/      # Proposal management
│   │   ├── invoices/       # Invoice management
│   │   ├── playbooks/      # Playbook builder
│   │   ├── settings/       # Company and notification settings
│   │   └── team/           # Team member management
│   ├── invoice/[id]/       # Public invoice view
│   └── proposal/[id]/      # Public proposal view (sign page)
├── components/
│   ├── ui/                 # Shared UI components
│   ├── customers/          # Customer-specific components
│   ├── jobs/               # Job-specific components
│   └── ...
├── lib/
│   ├── supabase.ts         # Supabase client helpers
│   ├── twilio.ts           # Twilio SMS helper
│   ├── stripe.ts           # Stripe helper
│   └── utils.ts            # Formatting and utility functions
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seed.sql
├── types/                  # TypeScript type definitions
├── vercel.json             # Vercel config and cron schedules
└── tailwind.config.ts
```
