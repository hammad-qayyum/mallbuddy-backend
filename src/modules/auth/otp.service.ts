import prisma from "../../config/prisma";
import { normalizePhoneNumber } from "../common/utils";
import { sendOTPEmail, sendOTPSMS } from "./otp-communication.service";
import twilio from "twilio";
import crypto from "crypto";

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || "10", 10);
// Hard cap on failed verify attempts before the OTP is invalidated.
const MAX_OTP_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || "5", 10);

const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;



/**
 * Generate a cryptographically-secure random 6-digit OTP (Email only).
 * Math.random() is forbidden here — its predictability speeds up brute-force.
 */
function generateOTP(): string {
  return crypto.randomInt(100000, 1_000_000).toString();
}

/**
 * Generate verification token using a CSPRNG.
 */
function generateVerificationToken(): string {
  return `vrf_${Date.now()}_${crypto.randomBytes(12).toString("hex")}`;
}

/**
 * Check if identifier already registered
 */
async function isIdentifierRegistered(
  email?: string,
  phoneNumber?: string,
  signupType: "user" | "restaurant" = "user"
): Promise<{ registered: boolean; type?: "email" | "phone" }> {

  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { role: true },
    });

    if (user) {
      if (signupType === "restaurant" && user.role === "RESTAURANT")
        return { registered: true, type: "email" };

      if (signupType === "user" && (user.role === "USER" || user.role === "RESTAURANT"))
        return { registered: true, type: "email" };
    }
  }

  if (phoneNumber) {
    const normalized = normalizePhoneNumber(phoneNumber);

    const user = await prisma.user.findUnique({
      where: { phoneNumber: normalized },
      select: { role: true },
    });

    if (user) {
      if (signupType === "restaurant" && user.role === "RESTAURANT")
        return { registered: true, type: "phone" };

      if (signupType === "user" && (user.role === "USER" || user.role === "RESTAURANT"))
        return { registered: true, type: "phone" };
    }
  }

  return { registered: false };
}

/**
 * Store email OTP in DB
 */
async function storeEmailOTP(identifier: string, otp: string, signupType: "user" | "restaurant") {

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

  const identifierWithType = `${signupType}:${identifier}`;

  await prisma.verification.deleteMany({
    where: { identifier: identifierWithType },
  });

  await prisma.verification.create({
    data: {
      identifier: identifierWithType,
      value: otp,
      expiresAt,
    },
  });
}

/**
 * Verify email OTP from DB. Tracks failed attempts on the verification row
 * and deletes it once the attempt cap is hit, forcing a fresh OTP request.
 * Combined with the rate limiter on /verify-otp, this defeats brute-force
 * of the 6-digit code.
 */
async function verifyEmailOTP(identifier: string, otp: string, signupType: "user" | "restaurant") {
  const identifierWithType = `${signupType}:${identifier}`;

  // Find the most recent OTP for this identifier, regardless of value, so we
  // can increment the attempt counter on a wrong guess.
  const verification = await prisma.verification.findFirst({
    where: { identifier: identifierWithType },
    orderBy: { createdAt: "desc" },
  });

  if (!verification) return { valid: false };

  if (verification.expiresAt < new Date()) {
    await prisma.verification.delete({ where: { id: verification.id } });
    return { valid: false, expired: true };
  }

  // Use timing-safe comparison to avoid leaking the OTP through response time.
  const submitted = Buffer.from(otp);
  const expected = Buffer.from(verification.value);
  const matches =
    submitted.length === expected.length && crypto.timingSafeEqual(submitted, expected);

  if (matches) {
    await prisma.verification.delete({ where: { id: verification.id } });
    return { valid: true };
  }

  // Wrong guess — bump attempts; nuke the row if cap is hit so the attacker
  // can't keep trying without first re-passing the OTP-request rate limit.
  const newAttempts = (verification.attempts ?? 0) + 1;
  if (newAttempts >= MAX_OTP_ATTEMPTS) {
    await prisma.verification.delete({ where: { id: verification.id } });
    return { valid: false, exhausted: true };
  }
  await prisma.verification.update({
    where: { id: verification.id },
    data: { attempts: newAttempts },
  });
  return { valid: false };
}

export const otpService = {

  /**
   * Request OTP
   */
  async requestOTP(
    email?: string,
    phoneNumber?: string,
    signupType: "user" | "restaurant" = "user"
  ) {

    if (!email && !phoneNumber) {
      throw new Error("Email or phone number is required");
    }

    const check = await isIdentifierRegistered(email, phoneNumber, signupType);

    if (check.registered) {
      throw new Error(`${check.type} is already registered`);
    }

    if (email) {

      const otp = generateOTP();

      await storeEmailOTP(email, otp, signupType);

      await sendOTPEmail(email, otp, signupType);

      return {
        message: "OTP sent to email",
        ...(process.env.NODE_ENV === "development" && { otp }),
      };

    }

    if (phoneNumber) {

      const normalized = normalizePhoneNumber(phoneNumber);

      await sendOTPSMS(normalized);

      return {
        message: "OTP sent to SMS",
      };
    }
  },

  /**
   * Verify OTP
   */
  async verifyOTP(
    email?: string,
    phoneNumber?: string,
    otp?: string,
    signupType: "user" | "restaurant" = "user"
  ) {

    if (!otp) throw new Error("OTP required");

    let identifier = email || phoneNumber!;
    let identifierType: "email" | "phone" = email ? "email" : "phone";

    if (email) {
      const result = await verifyEmailOTP(identifier, otp, signupType);
      if (!result.valid) {
        if (result.expired) throw new Error("OTP expired");
        if ((result as any).exhausted) throw new Error("Too many invalid attempts. Please request a new OTP.");
        throw new Error("Invalid OTP");
      }
    } else if (phoneNumber) {
      const normalized = normalizePhoneNumber(phoneNumber);
      if (!twilioClient) throw new Error("Twilio not configured");
      const verification = await twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
        .verificationChecks.create({
          to: normalized,
          code: otp,
        });
      if (verification.status !== "approved") {
        throw new Error("Invalid OTP");
      }
      identifier = normalized;
      identifierType = "phone";
    }

    const verificationToken = generateVerificationToken();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    await prisma.verification.create({
      data: {
        identifier: `token:${verificationToken}`,
        value: JSON.stringify({
          identifier,
          identifierType,
          signupType,
          verifiedAt: new Date().toISOString(),
        }),
        expiresAt,
      },
    });

    return {
      verified: true,
      verificationToken,
      identifier,
      identifierType,
    };
  },
  /**
   * Get verified identifier from verification token
   */
  async getVerifiedIdentifier(verificationToken: string) {
    const record = await prisma.verification.findFirst({
      where: { identifier: `token:${verificationToken}` },
      orderBy: { createdAt: "desc" },
    });
    if (!record) throw new Error("Invalid or expired verification token");
    if (record.expiresAt < new Date()) {
      await prisma.verification.delete({ where: { id: record.id } });
      throw new Error("Verification token expired");
    }
    // Optionally delete after use
    await prisma.verification.delete({ where: { id: record.id } });
    return JSON.parse(record.value);
  },

  /**
   * Request password reset OTP (email or phone)
   */
  async requestPasswordResetOTP(email?: string, phoneNumber?: string) {
    if (!email && !phoneNumber) {
      throw new Error("Email or phone number is required");
    }
    // You may want to check if the user exists here
    if (email) {
      const otp = generateOTP();
      // Use a different identifier for password reset
      await storeEmailOTP(email, otp, "user");
      await sendOTPEmail(email, otp, "user");
      return {
        message: "Password reset OTP sent to email",
        ...(process.env.NODE_ENV === "development" && { otp }),
      };
    }
    if (phoneNumber) {
      const normalized = normalizePhoneNumber(phoneNumber);
      await sendOTPSMS(normalized);
      return {
        message: "Password reset OTP sent to SMS",
      };
    }
  },

  /**
   * Verify password reset OTP (email or phone)
   */
  async verifyPasswordResetOTP(email?: string, phoneNumber?: string, otp?: string) {
    if (!otp) throw new Error("OTP required");
    let identifier = email || phoneNumber!;
    let identifierType: "email" | "phone" = email ? "email" : "phone";
    if (email) {
      const result = await verifyEmailOTP(identifier, otp, "user");
      if (!result.valid) {
        if (result.expired) throw new Error("OTP expired");
        throw new Error("Invalid OTP");
      }
    } else if (phoneNumber) {
      const normalized = normalizePhoneNumber(phoneNumber);
      if (!twilioClient) throw new Error("Twilio not configured");
      const verification = await twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
        .verificationChecks.create({
          to: normalized,
          code: otp,
        });
      if (verification.status !== "approved") {
        throw new Error("Invalid OTP");
      }
      identifier = normalized;
      identifierType = "phone";
    }
    // Generate verification token and store in DB (like verifyOTP)
    const verificationToken = generateVerificationToken();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);
    await prisma.verification.create({
      data: {
        identifier: `token:${verificationToken}`,
        value: JSON.stringify({
          identifier,
          identifierType,
          purpose: "password-reset",
          verifiedAt: new Date().toISOString(),
        }),
        expiresAt,
      },
    });
    return {
      verified: true,
      verificationToken,
      identifier,
      identifierType,
    };
  },
};
