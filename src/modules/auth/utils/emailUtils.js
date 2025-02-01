const nodemailer = require('nodemailer');

/**
 * Sends an email with OTP for account verification.
 * @param {string} email - The recipient's email address.
 * @param {string} otp - The OTP to be sent to the recipient.
 * @returns {Promise<boolean>} - Returns true if email is successfully sent, false otherwise.
 */
const sendEmailVerification = async (email, otp) => {
    try {
        // Create transporter using environment variables
        const transporter = nodemailer.createTransport({
            service: 'gmail', // You can change this to any other service
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            },
        });

        // Send OTP email
        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'Verify your account',
            text: `Your OTP is ${otp}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
                    <h2 style="color: #333;">Your OTP Code</h2>
                    <div style="border: 2px solid #4CAF50; padding: 10px; border-radius: 5px; display: inline-block;">
                        <h1 style="margin: 0; font-size: 24px; color: #4CAF50;">${otp}</h1>
                    </div>
                    <p style="margin-top: 10px;">Please enter this OTP to complete your registration.</p>
                </div>
            `,
        };

        // Sending email and returning success status
        const info = await transporter.sendMail(mailOptions);

        return info.accepted.length > 0;
    } catch (error) {
        console.error('Error sending the email:', error);
        return false;
    }
};

module.exports = sendEmailVerification