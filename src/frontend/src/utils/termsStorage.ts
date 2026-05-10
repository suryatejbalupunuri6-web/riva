export const CURRENT_TERMS_VERSION = "1.0";

const STORAGE_KEY_ACCEPTED = "riva_termsAccepted";
const STORAGE_KEY_VERSION = "riva_acceptedVersion";

export function hasAcceptedTerms(): boolean {
  try {
    const accepted = localStorage.getItem(STORAGE_KEY_ACCEPTED);
    const version = localStorage.getItem(STORAGE_KEY_VERSION);
    return accepted === "true" && version === CURRENT_TERMS_VERSION;
  } catch {
    return false;
  }
}

export function acceptTerms(): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACCEPTED, "true");
    localStorage.setItem(STORAGE_KEY_VERSION, CURRENT_TERMS_VERSION);
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function declineTerms(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_ACCEPTED);
    localStorage.removeItem(STORAGE_KEY_VERSION);
  } catch {
    // silently ignore
  }
}

export function needsTermsAcceptance(): boolean {
  return !hasAcceptedTerms();
}
