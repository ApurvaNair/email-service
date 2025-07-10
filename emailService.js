const ProviderOne = require("./emailProviders/providerOne.js");
const ProviderTwo = require("./emailProviders/providerTwo.js");

const wait = require("./utils/wait.js");
const Tracker = require("./utils/tracker.js");

const { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync } = require("fs");
const { join, dirname } = require("path");

// CircuitBreaker 
class CircuitBreaker {
  constructor(limit = 3, cooldown = 30000) {
    this.failures = 0;
    this.limit = limit; // fail limit
    this.cooldown = cooldown; // wait before retrying
    this.lastFailureTime = null;
  }

  canAttempt() {
    if (this.failures < this.limit) return true;
    if (Date.now() - this.lastFailureTime > this.cooldown) {
      this.reset(); // cooldown over
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

// The Main Event
class EmailService {
  constructor() {
    // If one fails, we try the other!
    this.providers = [new ProviderOne(), new ProviderTwo()];

    // Memory for rate limits and sent emails (idempotency)
    this.tracker = new Tracker(5); 
    this.signature = "\n\nRegards,\nTeam PearlThoughts"; 

    // Log files to trace all email activity and delivery outcomes
    this.logPath = join(__dirname, "logs", "activity.txt");
    this.historyPath = join(__dirname, "logs", "sendHistory.json");

    this.queue = []; // Email queue 
    this.breakers = new Map(); // Each provider has its own circuit breaker

    this.setupLogs(); // Make sure logs exist before we write
  }

  // Create logs folder and files if they don’t exist
  setupLogs() {
    const logDir = dirname(this.logPath);
    if (!existsSync(logDir)) mkdirSync(logDir);
    if (!existsSync(this.historyPath)) writeFileSync(this.historyPath, "[]");
    writeFileSync(this.logPath, "📋 Email Activity Log\n\n", { flag: "w" });
  }

  // Place email in queue and start sending if not already sending
  async enqueueEmail(email) {
    this.queue.push(email);
    this.log(`Email [${email.id}] added to queue.`);
    if (this.queue.length === 1) await this.processQueue();
  }

  // Process each email one-by-one
  async processQueue() {
    while (this.queue.length > 0) {
      const email = this.queue[0];
      await this.sendEmail(email);
      this.queue.shift(); // remove after sending
    }
  }

  // The main dispatcher function
  async sendEmail(email) {
    email.body += this.signature; // Add professional signature

    // Skip if already sent
    if (this.tracker.alreadySent(email.id)) {
      this.log(`Duplicate detected. Email [${email.id}] already sent.`);
      return;
    }

    // Respect rate limits
    if (!this.tracker.canSend()) {
      this.log("Rate limit exceeded. Email dispatch postponed.");
      return;
    }

    // Try each provider until one succeeds
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
          await this.countdown(3); // Visual countdown
          await wait(300 * attempt); // Wait before retry
          await provider.send(email); // Try sending

          // Success
          this.tracker.remember(email.id);
          this.log(`Email [${email.id}] sent via ${provider.name}.`);
          this.saveToHistory(email, provider.name, "SENT");
          breaker.reset();
          return;
        } catch (err) {
          this.log(`Attempt ${attempt} failed with ${provider.name}: ${err.message}`);
          breaker.recordFailure();
        }
      }

      // Move to next provider
      this.log(`Switching from ${provider.name} to next provider.`);
    }

    // All providers failed
    this.log(`All providers failed to deliver email [${email.id}].`);
    this.saveToHistory(email, "None", "FAILED");
  }

  // Show countdown before retry
  async countdown(seconds) {
    for (let i = seconds; i > 0; i--) {
      process.stdout.write(`Retrying in ${i}...\r`);
      await wait(1000);
    }
    process.stdout.write("\n");
  }

  // Store delivery status in history file
  saveToHistory(email, provider, status) {
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

  // Simple logger for debugging and understanding flow
  log(message) {
    const entry = `[${new Date().toLocaleString()}] ${message}\n`;
    console.log(entry.trim());
    appendFileSync(this.logPath, entry);
  }
}

module.exports = EmailService;
