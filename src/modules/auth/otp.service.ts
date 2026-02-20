import prisma from "../../config/prisma";
import { normalizePhoneNumber } from "../common/utils";
import { sendOTPEmail, sendOTPSMS } from "./otp-communication.service";

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || "10", 10);

/**
 * Generate a random 6-digit OTP
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Check if identifier (email or phone) is already registered
 * @param email - Email address
 * @param phoneNumber - Phone number
 * @param signupType - 'user' or 'restaurant' to check appropriate accounts
 */
async function isIdentifierRegistered(
  email?: string,
  phoneNumber?: string,
  signupType: "user" | "restaurant" = "user"
): Promise<{ registered: boolean; type?: "email" | "phone" }> {
  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });
    if (user) {
      // For restaurant signup, check if it's already a restaurant account
      if (signupType === "restaurant" && user.role === "RESTAURANT") {
        return { registered: true, type: "email" };
      }
      // For user signup, check if it's a regular user account
      if (signupType === "user" && user.role === "USER") {
        return { registered: true, type: "email" };
      }
      // If trying to signup as restaurant but email is USER, allow (different roles)
      // If trying to signup as user but email is RESTAURANT, block
      if (signupType === "user" && user.role === "RESTAURANT") {
        return { registered: true, type: "email" };
      }
    }
  }

  if (phoneNumber) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const user = await prisma.user.findUnique({
      where: { phoneNumber: normalizedPhone },
      select: { id: true, role: true },
    });
    if (user) {
      if (signupType === "restaurant" && user.role === "RESTAURANT") {
        return { registered: true, type: "phone" };
      }
      if (signupType === "user" && user.role === "USER") {
        return { registered: true, type: "phone" };
      }
      if (signupType === "user" && user.role === "RESTAURANT") {
        return { registered: true, type: "phone" };
      }
    }
  }

  return { registered: false };
}

/**
 * Store OTP in database with signup type context
 */
async function storeOTP(
  identifier: string,
  otp: string,
  type: "email" | "phone",
  signupType: "user" | "restaurant"
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

  // Delete any existing OTPs for this identifier and signup type
  // Store signup type in identifier to differentiate
  const identifierWithType = `${signupType}:${identifier}`;
  
  await prisma.verification.deleteMany({
    where: { identifier: identifierWithType },
  });

  // Store new OTP
  await prisma.verification.create({
    data: {
      identifier: identifierWithType,
      value: otp,
      expiresAt,
    },
  });
}

/**
 * Generate a verification token
 */
function generateVerificationToken(): string {
  return `vrf_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Verify OTP with signup type context and create verification token
 */
async function verifyOTPInternal(
  identifier: string,
  otp: string,
  signupType: "user" | "restaurant"
): Promise<{ valid: boolean; expired?: boolean; verificationToken?: string; identifier?: string; identifierType?: "email" | "phone" }> {
  const identifierWithType = `${signupType}:${identifier}`;
  
  const verification = await prisma.verification.findFirst({
    where: {
      identifier: identifierWithType,
      value: otp,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!verification) {
    return { valid: false };
  }

  if (verification.expiresAt < new Date()) {
    await prisma.verification.delete({
      where: { id: verification.id },
    });
    return { valid: false, expired: true };
  }

  // Delete the OTP verification record
  await prisma.verification.delete({
    where: { id: verification.id },
  });

  // Create a verification token that stores the verified identifier
  const verificationToken = generateVerificationToken();
  const tokenExpiresAt = new Date();
  tokenExpiresAt.setMinutes(tokenExpiresAt.getMinutes() + 30); // Token valid for 30 minutes

  // Determine identifier type
  const identifierType = identifier.includes("@") ? "email" : "phone";

  // Store verification token (only for signup, password reset handles its own token)
  if (signupType) {
    await prisma.verification.create({
      data: {
        identifier: `token:${verificationToken}`,
        value: JSON.stringify({
          identifier,
          identifierType,
          signupType,
          purpose: "signup",
          verifiedAt: new Date().toISOString(),
        }),
        expiresAt: tokenExpiresAt,
      },
    });
  }

  const result: {
    valid: boolean;
    expired?: boolean;
    verificationToken?: string;
    identifier?: string;
    identifierType?: "email" | "phone";
  } = {
    valid: true,
    identifier,
    identifierType,
  };

  if (signupType) {
    result.verificationToken = verificationToken;
  }

  return result;
}

export const otpService = {
  /**
   * Request OTP for user or restaurant signup
   */
  async requestOTP(
    email?: string,
    phoneNumber?: string,
    signupType: "user" | "restaurant" = "user"
  ) {
    if (!email && !phoneNumber) {
      throw new Error("Email or phone number is required");
    }

    // Check if identifier is already registered
    const check = await isIdentifierRegistered(email, phoneNumber, signupType);
    if (check.registered) {
      const identifierType = check.type === "email" ? "email" : "phone number";
      throw new Error(
        `This ${identifierType} is already registered${signupType === "restaurant" ? " as a restaurant" : ""}`
      );
    }

    const otp = generateOTP();
    const identifier = email || phoneNumber!;

    // Store OTP with signup type context
    await storeOTP(
      identifier,
      otp,
      email ? "email" : "phone",
      signupType
    );

    // Send OTP using Resend (email) or Twilio (SMS)
    try {
      if (email) {
        await sendOTPEmail(email, otp, signupType);
      } else if (phoneNumber) {
        await sendOTPSMS(phoneNumber, otp, signupType);
      }
    } catch (error: any) {
      // If sending fails, clean up the stored OTP
      const identifierWithType = `${signupType}:${identifier}`;
      await prisma.verification.deleteMany({
        where: { identifier: identifierWithType },
      });
      throw error;
    }

    return {
      message: `OTP sent to ${email ? "email" : "phone number"}`,
      // In production, don't return the OTP. This is for testing only.
      // Remove this in production:
      ...(process.env.NODE_ENV === "development" && { otp }),
    };
  },

  /**
   * Verify OTP for user or restaurant signup
   */
  async verifyOTP(
    email?: string,
    phoneNumber?: string,
    otp?: string,
    signupType: "user" | "restaurant" = "user"
  ) {
    if (!email && !phoneNumber) {
      throw new Error("Email or phone number is required");
    }
    if (!otp) {
      throw new Error("OTP is required");
    }

    const identifier = email || phoneNumber!;
    const result = await verifyOTPInternal(identifier, otp, signupType);

    if (!result.valid) {
      if (result.expired) {
        throw new Error("OTP has expired. Please request a new one.");
      }
      throw new Error("Invalid OTP");
    }

    return {
      verified: true,
      verificationToken: result.verificationToken,
      identifier: result.identifier,
      identifierType: result.identifierType,
    };
  },

  /**
   * Get verified identifier from verification token
   */
  async getVerifiedIdentifier(verificationToken: string): Promise<{
    identifier: string;
    identifierType: "email" | "phone";
    signupType?: "user" | "restaurant";
    purpose?: "signup" | "password-reset";
  }> {
    const verification = await prisma.verification.findFirst({
      where: {
        identifier: `token:${verificationToken}`,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!verification) {
      throw new Error("Invalid verification token");
    }

    if (verification.expiresAt < new Date()) {
      await prisma.verification.delete({
        where: { id: verification.id },
      });
      throw new Error("Verification token has expired");
    }

    const data = JSON.parse(verification.value);
    return {
      identifier: data.identifier,
      identifierType: data.identifierType,
      signupType: data.signupType,
      purpose: data.purpose || "signup",
    };
  },

  /**
   * Request OTP for password reset
   */
  async requestPasswordResetOTP(email?: string, phoneNumber?: string) {
    if (!email && !phoneNumber) {
      throw new Error("Email or phone number is required");
    }

    // Check if identifier is registered (for password reset, user must exist)
    const check = await isIdentifierRegistered(email, phoneNumber, "user");
    if (!check.registered) {
      throw new Error("No account found with this email or phone number");
    }

    const otp = generateOTP();
    const identifier = email || phoneNumber!;

    // Store OTP for password reset (different from signup)
    await storeOTP(
      identifier,
      otp,
      email ? "email" : "phone",
      "user" // Use "user" as signupType for password reset
    );

    // Send OTP
    try {
      if (email) {
        await sendOTPEmail(email, otp, "user");
      } else if (phoneNumber) {
        await sendOTPSMS(phoneNumber, otp, "user");
      }
    } catch (error: any) {
      const identifierWithType = `user:${identifier}`;
      await prisma.verification.deleteMany({
        where: { identifier: identifierWithType },
      });
      throw error;
    }

    return {
      message: `OTP sent to ${email ? "email" : "phone number"}`,
      ...(process.env.NODE_ENV === "development" && { otp }),
    };
  },

  /**
   * Verify OTP for password reset
   */
  async verifyPasswordResetOTP(email?: string, phoneNumber?: string, otp?: string) {
    if (!email && !phoneNumber) {
      throw new Error("Email or phone number is required");
    }
    if (!otp) {
      throw new Error("OTP is required");
    }

    const identifier = email || phoneNumber!;
    const result = await verifyOTPInternal(identifier, otp, "user");

    if (!result.valid) {
      if (result.expired) {
        throw new Error("OTP has expired. Please request a new one.");
      }
      throw new Error("Invalid OTP");
    }

    // Create verification token for password reset
    const verificationToken = generateVerificationToken();
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setMinutes(tokenExpiresAt.getMinutes() + 30);

    // Store verification token with password reset purpose
    await prisma.verification.create({
      data: {
        identifier: `token:${verificationToken}`,
        value: JSON.stringify({
          identifier,
          identifierType: result.identifierType,
          purpose: "password-reset",
          verifiedAt: new Date().toISOString(),
        }),
        expiresAt: tokenExpiresAt,
      },
    });

    return {
      verified: true,
      verificationToken,
      identifier: result.identifier,
      identifierType: result.identifierType,
    };
  },
};

