// Email Service Configuration
// To enable real email delivery, you need to configure one of these services:

export const EmailConfig = {
  // Option 1: EmailJS (Recommended for quick setup)
  // 1. Go to https://www.emailjs.com/
  // 2. Create a free account
  // 3. Set up a service (Gmail, Outlook, etc.)
  // 4. Create an email template
  // 5. Replace the values below with your actual IDs
  emailJS: {
    serviceID: 'service_your_id',     // Your EmailJS service ID
    templateID: 'template_your_id',   // Your EmailJS template ID
    userID: 'your_user_id'            // Your EmailJS user ID
  },

  // Option 2: Formspree (Simple form-to-email service)
  // 1. Go to https://formspree.io/
  // 2. Create a free account
  // 3. Create a new form
  // 4. Replace the form ID below
  formspree: {
    formID: 'your_form_id'            // Your Formspree form ID
  },

  // Option 3: SMTP Service (SendGrid, Mailgun, etc.)
  // 1. Choose an SMTP service provider
  // 2. Get your API key and endpoint
  // 3. Configure the settings below
  smtp: {
    apiEndpoint: 'https://api.your-smtp-service.com/send',
    apiKey: 'your_api_key',
    fromEmail: 'celltowertracker@yourdomain.com'
  }
};

// Instructions for setup:
// 1. Choose one of the email services above
// 2. Follow the setup instructions for that service
// 3. Update the configuration values
// 4. The app will automatically try each method until one succeeds