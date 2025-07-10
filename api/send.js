const EmailService = require("../emailService");

module.exports = async (req, res) => {
  try {
    const service = new EmailService();

    const email = {
      id: "email-vercel-1",
      to: "student@example.com",
      subject: "Deployed from Vercel",
      body: "Hello from the cloud!"
    };

    await service.enqueueEmail(email);

    res.status(200).json({
      message: "Email processed successfully",
      id: email.id
    });

  } catch (error) {
    console.error("Function crashed:", error);
    res.status(500).json({
      error: "Internal Server Error",
      reason: error.message
    });
  }
};
