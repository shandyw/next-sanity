export const LEAD_SUBMITTED_KEY = 'curvygirlreviews:lead:submitted:v1';
export const LEAD_SESSION_SHOWN_KEY = 'curvygirlreviews:lead:shown:v2';
export const LEAD_DISMISSED_KEY = 'curvygirlreviews:lead:dismissed:v2';
export const LEAD_SESSION_STARTED_KEY = 'curvygirlreviews:lead:started:v2';
export const LEAD_DELAY_MS = 20_000;
export const LEAD_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

// A blocked storage API must not cause the prompt to repeat within this page visit.
const fallback: Record<string, string> = {};
const failedWrites = new Set<string>();
function read(store: 'local' | 'session', key: string) {
  const fallbackKey = `${store}:${key}`;
  if (typeof window === 'undefined') return fallback[fallbackKey] ?? null;
  try {
    const value = (store === 'local' ? window.localStorage : window.sessionStorage).getItem(key);
    if (value === null && failedWrites.has(fallbackKey)) return fallback[fallbackKey] ?? null;
    if (value === null) delete fallback[fallbackKey];
    else fallback[fallbackKey] = value;
    return value;
  } catch {
    return fallback[fallbackKey] ?? null;
  }
}
function write(store: 'local' | 'session', key: string, value: string) {
  const fallbackKey = `${store}:${key}`;
  fallback[fallbackKey] = value;
  if (typeof window === 'undefined') return;
  try {
    (store === 'local' ? window.localStorage : window.sessionStorage).setItem(key, value);
    failedWrites.delete(fallbackKey);
  } catch {
    failedWrites.add(fallbackKey);
  }
}
export function leadSessionStarted(now = Date.now()) {
  const stored = Number(read('session', LEAD_SESSION_STARTED_KEY));
  if (stored > 0 && stored <= now) return stored;
  write('session', LEAD_SESSION_STARTED_KEY, String(now));
  return now;
}
export function leadAutoPromptEligible(now = Date.now()) {
  if (read('local', LEAD_SUBMITTED_KEY) === 'true') return false;
  if (read('session', LEAD_SESSION_SHOWN_KEY) === 'true') return false;
  const dismissed = Number(read('local', LEAD_DISMISSED_KEY));
  return !(dismissed > 0 && now - dismissed < LEAD_COOLDOWN_MS);
}
export function markLeadShown() {
  write('session', LEAD_SESSION_SHOWN_KEY, 'true');
}
export function dismissLead(now = Date.now()) {
  write('local', LEAD_DISMISSED_KEY, String(now));
}
// Store only suppression flags, never the visitor's email address.
export function rememberLeadSignup() {
  write('local', LEAD_SUBMITTED_KEY, 'true');
}
export function leadSignupSucceeded() {
  return read('local', LEAD_SUBMITTED_KEY) === 'true';
}
export function halfPageReached() {
  if (typeof window === 'undefined') return false;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  return scrollable > 0 && window.scrollY > 0 && window.scrollY >= scrollable / 2;
}
