// Another fake email provider 

class ProviderTwo {
  constructor() {
    this.name = "ProviderTwo";
  }

  async send(email) {
    // Fail only 30% of the time 
    if (Math.random() < 0.3) {
      throw new Error("Simulated ProviderTwo failure");
    }

    // If it works
    console.log(`✅ ProviderTwo sending email to: ${email.to}`);

    // Delay 
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Export the provider so others can use it
module.exports = ProviderTwo;
