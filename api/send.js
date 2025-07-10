const EmailService = require("../emailService");

// Export a function 
module.exports = async (req, res) => {
  const service = new EmailService();

  // Create a mock email object (
  const email = {
    id: "email-vercel-1",                     
    to: "student@example.com",               
    subject: "Deployed from Vercel",           
    body: "Hello from the cloud!"             
  };

  // Add the email to the queue and process it
  await service.enqueueEmail(email);

  // Send a JSON response to the client
  res.status(200).json({
    message: "Email processed",         
    id: email.id                               
  });
};
