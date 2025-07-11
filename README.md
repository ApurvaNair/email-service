**Resilient Email Sending Service**

This project is a simple yet powerful email sending service that simulates real-world behavior of email delivery. 
It uses two mock providers, adds retry logic, fallback handling, circuit breakers, rate-limiting, and tracks the status of each email.

**Goal: To create a reliable email sending service that simulates the real one and overcomes drawbacks.**

### Core Features

- **Retry Mechanism** — Tries again if email sending fails
- **Fallback Providers** — Switches to another provider on failure
- **Idempotency** — Prevents duplicate emails with the same ID
- **Rate Limiting** — Allows only 5 emails per minute
- **Status Tracking** — Logs all email attempts and results

### Bonus Features

- **Circuit Breaker Pattern** — Skips broken providers after 3 failures
- **Simple Logging** — All activity is saved in `logs/`
- **Basic Queue System** — Emails are queued and sent one by one

### Basic Idea of the System

1. You send an email object to the service.
2. The system checks:
   - Is it a duplicate?
   - Are we within rate limits?
3. It tries sending via ProviderOne.
4. If it fails, it retries once more.
5. Still fails? → It switches to ProviderTwo.
6. All actions are logged and saved to history.

### Project Structure
email-service/
├── emailService.js      # Main service logic
├── api/
      ├── send.js        # Vercel API handler (for deployment)
├── emailProviders/
│     ├── providerOne.js # First mock provider
│     └── providerTwo.js # Second mock provider
├── utils/
│     ├── wait.js        # Delay utility
│     └── tracker.js     # Rate limit + idempotency tracker
├── logs/
│     ├── activity.txt     # Log of all actions
│     └── sendHistory.json # Stores email send history
├── test/
│     └── emailService.test.js # Unit tests 
└── package.json    #Project Details

### How to Run

SI: Open terminal

SII: Clone Repository
git clone https://github.com/YourUsername/email-service.git

SIII: Switch Directory
cd email-service

SIV: Install npm
npm install

SV: Run 
node test/emailService.test.js

Note: Powershell might not allow npm installation. Run terminal as administrator if needed.

### Live Demo Api
Try it now : https://email-service-iegtc6q8g-apurva-nairs-projects.vercel.app/api/send

### Sample Output:(JSON format)

{
  "message": "Email processed successfully",
  "id": "email-vercel-1"
}



