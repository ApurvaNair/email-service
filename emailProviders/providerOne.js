// Fake email provider 1 

class ProviderOne {
  constructor() {
    this.name = "ProviderOne";
  }

  async send(email) {
    // Randomly fails, error thrown
    if (Math.random() < 0.5) {
      throw new Error("Simulated ProviderOne failure");
    }

    // If it doesn’t fail
    console.log(`✅ ProviderOne sending email to: ${email.to}`);

    //Creates Delay 
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Allow other files to use this provider
module.exports = ProviderOne;
