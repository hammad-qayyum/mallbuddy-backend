import { Resend } from "resend";
import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();
// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Twilio
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || "10", 10);

/**
 * Send OTP via email using Resend
 */
export async function sendOTPEmail(
  email: string,
  otp: string,
  signupType: "user" | "restaurant"
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[OTP Email] RESEND_API_KEY not configured. Skipping email send.");
    console.log(`[OTP Email] Would send OTP ${otp} to ${email} for ${signupType} signup`);
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@mallbuddy.net",
      to: email,
      subject: `Your ${signupType === "restaurant" ? "Restaurant" : "Account"} Verification Code`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verification Code</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
              <h2 style="color: #333; margin-top: 0;">Verification Code</h2>
              <p>Hello,</p>
              <p>Your verification code for ${signupType === "restaurant" ? "restaurant" : "account"} signup is:</p>
              <div style="background-color: #fff; border: 2px dashed #333; padding: 20px; text-align: center; margin: 20px 0;">
                <h1 style="color: #007bff; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
              </div>
              <p>This code will expire in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.</p>
              <p>If you didn't request this code, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("[OTP Email] Resend error:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log(`[OTP Email] Successfully sent OTP to ${email} via Resend. Email ID: ${data?.id}`);
  } catch (error: any) {
    console.error(`[OTP Email] Error sending OTP to ${email}:`, error);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}

/**
 * Send OTP via SMS using Twilio
 */
export async function sendOTPSMS(
  phoneNumber: string
): Promise<void> {

  if (!twilioClient) {
    console.warn("[OTP] Twilio not configured.");
    return;
  }

  try {
    const formattedPhone = phoneNumber.startsWith("+")
  ? phoneNumber
  : `+${phoneNumber}`;
  console.log("VERIFY SERVICE SID:", process.env.TWILIO_VERIFY_SERVICE_SID);
console.log("Sending to:", formattedPhone);

    const response = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({
        to: formattedPhone,
        channel: "sms",
      });

    console.log(`[OTP SMS] Verification started for ${phoneNumber}. Status: ${response.status}`);

  } catch (error: any) {
    console.error(`[OTP SMS] Error sending OTP:`, error);

    if (error.code === 60200) {
      throw new Error("Invalid phone number");
    }

    throw new Error(`Failed to send SMS OTP: ${error.message}`);
  }
}

