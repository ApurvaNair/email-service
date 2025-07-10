const EmailService = require("../emailService.js");
const fs = require("fs");
const assert = require("assert");

// Helper: read log file
function readLog(service) {
  return fs.readFileSync(service.logPath, "utf-8");
}

// Helper: reset log file
function reset(service) {
  if (fs.existsSync(service.logPath)) fs.unlinkSync(service.logPath);
  if (fs.existsSync(service.historyPath)) fs.unlinkSync(service.historyPath);
}

(async () => {
  console.log("📦 Running EmailService Unit Tests...\n");

  const service = new EmailService();
  reset(service);

  // 1. Basic email sending
  const email1 = {
    id: "email-101",
    to: "test@example.com",
    subject: "Welcome",
    body: "Hello user!"
  };

  await service.enqueueEmail(email1);
  const logData1 = readLog(service);
  assert.ok(logData1.includes("sent via"), "Email should be sent successfully");
  console.log("Basic email sending passed");

  // 2. Idempotency
  await service.enqueueEmail(email1); // Send again
  const logData2 = readLog(service);
  assert.ok(logData2.includes("already sent"), "Duplicate email should be skipped");
  console.log("Duplicate email detection passed");

  // 3. Rate limit
  for (let i = 1; i <= 6; i++) {
    await service.enqueueEmail({
      id: `rate-${i}`,
      to: "rate@example.com",
      subject: "Rate test",
      body: "Testing rate"
    });
  }
  const logData3 = readLog(service);
  assert.ok(logData3.includes("Rate limit exceeded"), "Rate limit message should appear");
  console.log("Rate limiting passed");

  // 4. Fallback to second provider
  const failEmail = {
    id: "email-fallback",
    to: "fallback@example.com",
    subject: "Failover",
    body: "Trying fallback"
  };

  // Force ProviderOne to fail
  service.providers[0].send = async () => {
    throw new Error("Simulated failure");
  };

  await service.enqueueEmail(failEmail);
  const logData4 = readLog(service);
  assert.ok(logData4.includes("Switching from ProviderOne to next provider"), "Should switch provider");
  assert.ok(logData4.includes("sent via ProviderTwo"), "Fallback provider should succeed");
  console.log("Fallback provider works");

  // 5. Circuit breaker kicks in after 3 failures
  const breakerEmail = {
    id: "email-breaker",
    to: "breaker@example.com",
    subject: "Breaker test",
    body: "Force failure"
  };

  // Make both providers fail
  service.providers.forEach(provider => {
    provider.send = async () => {
      throw new Error("Always fail");
    };
  });

  for (let i = 1; i <= 4; i++) {
    await service.enqueueEmail({
      id: `breaker-${i}`,
      to: "x@example.com",
      subject: "Test",
      body: "Breaker check"
    });
  }

  const logData5 = readLog(service);
  assert.ok(logData5.includes("is in cooldown"), "Circuit breaker cooldown must activate");
  console.log("Circuit breaker works after repeated failures");

  // 6. History file tracks status
  const historyData = JSON.parse(fs.readFileSync(service.historyPath));
  const sentEntry = historyData.find(e => e.id === "email-101");
  assert.ok(sentEntry && sentEntry.status === "SENT", "Sent status should be recorded in history");
  console.log("Status tracking (history.json) passed");

  console.log("\n All tests passed successfully!");
})();
