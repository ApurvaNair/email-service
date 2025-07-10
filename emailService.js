const ProviderOne = require("./emailProviders/providerOne.js");
const ProviderTwo = require("./emailProviders/providerTwo.js");
const wait = require("./utils/wait.js");
const Tracker = require("./utils/tracker.js");
const fs = require("fs");
const { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync } = fs;
const { join, dirname } = require("path");

// Check if we're running on Vercel (no file writing allowed)
const isVercel = !!process.env.VERCEL;

// Circuit breaker to avoid using broken providers
class CircuitBreaker {
  constructor(limit = 3, cooldown = 30000) {
    this.failures = 0;
    this.limit = limit;
    this.cooldown = cooldown;
    this.lastFailureTime = null;
  }

  canAttempt() {
    if (this.failures < this.limit) return true;
    if (Date.now() - this.lastFailureTime > this.cooldown) {
      this.reset();
      return true;
    }
    return false;
  }

  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
  }

  reset() {
    this.failures = 0;
    this.lastFailureTime = null;
  }
}

class EmailService {
  constructor() {
    this.providers = [new ProviderOne(), new ProviderTwo()];
    this.tracker = new Tracker(5); // Allow max 5 emails per minute
    this.signature = "\n\nRegards,\nTeam PearlThoughts";
    this.logPath = join(__dirname, "logs", "activity.txt");
    this.historyPath = join(__dirname, "logs", "sendHistory.json");
    this.queue = [];
    this.breakers = new Map();
    this.setupLogs();
  }

  setupLogs() {
    if (isVercel) return; // Skip file setup on Vercel

    const logDir = dirname(this.logPath);
    if (!existsSync(logDir)) mkdirSync(logDir);
    if (!existsSync(this.historyPath)) writeFileSync(this.historyPath, "[]");
    writeFileSync(this.logPath, "Email Activity Log\n\n", { flag: "w" });
  }

  async enqueueEmail(email) {
    this.queue.push(email); // Add to queue
    this.log(`Email [${email.id}] added to queue.`);
    if (this.queue.length === 1) await this.processQueue(); // Process immediately if it's the only email
  }

  async processQueue() {
    while (this.queue.length > 0) {
      const email = this.queue[0];
      await this.sendEmail(email);
      this.queue.shift(); // Remove email from queue
    }
  }

  async sendEmail(email) {
    email.body += this.signature;

    // Prevent duplicate sends
    if (this.tracker.alreadySent(email.id)) {
      this.log(`Duplicate detected. Email [${email.id}] already sent.`);
      return;
    }

    // Check rate limit
    if (!this.tracker.canSend()) {
      this.log("Rate limit exceeded. Email dispatch postponed.");
      return;
    }

    for (let provider of this.providers) {
      if (!this.breakers.has(provider.name)) {
        this.breakers.set(provider.name, new CircuitBreaker());
      }

      const breaker = this.breakers.get(provider.name);

      if (!breaker.canAttempt()) {
        this.log(`${provider.name} is in cooldown. Skipping.`);
        continue;
      }

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          this.log(`Attempt ${attempt} via ${provider.name}.`);
          await this.countdown(3); // Optional delay before retry
          await wait(300 * attempt); // Exponential backoff
          await provider.send(email); // Simulated send
          this.tracker.remember(email.id); // Track sent email
          this.log(`Email [${email.id}] sent via ${provider.name}.`);
          this.saveToHistory(email, provider.name, "SENT");
          breaker.reset(); // Reset breaker on success
          return;
        } catch (err) {
          this.log(`Attempt ${attempt} failed with ${provider.name}: ${err.message}`);
          breaker.recordFailure();
        }
      }

      this.log(`Switching from ${provider.name} to next provider.`);
    }

    // If all providers failed
    this.log(`All providers failed to deliver email [${email.id}].`);
    this.saveToHistory(email, "None", "FAILED");
  }

  async countdown(seconds) {
    for (let i = seconds; i > 0; i--) {
      process.stdout.write(`Retrying in ${i}...\r`);
      await wait(1000);
    }
    process.stdout.write("\n");
  }

  saveToHistory(email, provider, status) {
    if (isVercel) return; // Skip history writing on Vercel

    const history = JSON.parse(readFileSync(this.historyPath));
    history.push({
      id: email.id,
      to: email.to,
      subject: email.subject,
      provider,
      status,
      time: new Date().toISOString(),
    });
    writeFileSync(this.historyPath, JSON.stringify(history, null, 2));
  }

  log(message) {
    const entry = `[${new Date().toLocaleString()}] ${message}\n`;
    console.log(entry.trim());

    if (!isVercel) {
      appendFileSync(this.logPath, entry);
    }
  }
}

module.exports = EmailService;
