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
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
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
  phoneNumber: string,
  otp: string,
  signupType: "user" | "restaurant"
): Promise<void> {
  if (!twilioClient) {
    console.warn("[OTP SMS] Twilio not configured. Skipping SMS send.");
    console.log(`[OTP SMS] Would send OTP ${otp} to ${phoneNumber} for ${signupType} signup`);
    return;
  }

  if (!process.env.TWILIO_PHONE_NUMBER) {
    console.warn("[OTP SMS] TWILIO_PHONE_NUMBER not configured. Skipping SMS send.");
    console.log(`[OTP SMS] Would send OTP ${otp} to ${phoneNumber} for ${signupType} signup`);
    return;
  }

  try {
    const message = await twilioClient.messages.create({
      body: `Your ${signupType === "restaurant" ? "restaurant" : "account"} verification code is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone.`,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
    });

    console.log(`[OTP SMS] Successfully sent OTP to ${phoneNumber} via Twilio. Message SID: ${message.sid}`);
  } catch (error: any) {
    console.error(`[OTP SMS] Error sending OTP to ${phoneNumber}:`, error);
    
    // Handle specific Twilio errors
    if (error.code === 21211) {
      throw new Error("Invalid phone number format");
    } else if (error.code === 21614) {
      throw new Error("Phone number is not a valid mobile number");
    } else if (error.code === 21408) {
      throw new Error("Permission to send SMS denied");
    }
    
    throw new Error(`Failed to send verification SMS: ${error.message}`);
  }
}

