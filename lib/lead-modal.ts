export const LEAD_SUBMITTED_KEY = 'curvygirlreviews:lead:submitted:v1';
export const LEAD_DISMISSED_KEY = 'curvygirlreviews:lead:dismissed:v1';

// Store only suppression flags, never the visitor's email address.
export function rememberLeadSignup() {
  try {
    localStorage.setItem(LEAD_SUBMITTED_KEY, 'true');
  } catch {}
}
