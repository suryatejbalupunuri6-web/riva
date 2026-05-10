// Clerk SMS OTP replaced by Caffeine AI Internet Identity (email/Google auth).
// This file is a stub so stray imports don't break the build.

export const isSignUpFlow = false;

/** No-op normalizer kept for stray call sites. */
export function normalizePhone(raw: string): string {
  return raw;
}

export interface OtpResult {
  success: boolean;
  message?: string;
  error?: string;
  isNewUser?: boolean;
}

export interface VerifyResult {
  success: boolean;
  sessionId?: string;
  error?: string;
  isNewUser?: boolean;
}

/** No-op — SMS OTP removed. Login handled by Internet Identity. */
export async function sendOtp(
  _phoneNumber?: string,
  _customerName?: string,
): Promise<OtpResult> {
  return { success: false, error: "SMS OTP removed. Use email/Google login." };
}

/** No-op — SMS OTP removed. */
export async function verifyOtp(_code?: string): Promise<VerifyResult> {
  return { success: false, error: "SMS OTP removed. Use email/Google login." };
}

/** No-op — session managed by Internet Identity. */
export async function clerkSignOut(): Promise<void> {
  // Internet Identity logout is handled by useInternetIdentity().clear()
}

/** Always returns null — session managed by Internet Identity. */
export async function getActiveClerkSession(): Promise<string | null> {
  return null;
}
