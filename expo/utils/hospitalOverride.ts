// Per-user hospital display override used when generating form emails.
// Only the listed user's submissions report the overridden hospital name;
// every other user's submissions show the hospital captured on the form.

export const HOSPITAL_NAME = 'Winny Solutions';
export const HOSPITAL_OVERRIDE_EMAIL = 'kgmoropane@winnysolutions.co.za';

// All email addresses belonging to KG Moropane: the admin account email plus
// the linked (non-admin) Gmail account.
const KG_ACCOUNT_EMAILS = [HOSPITAL_OVERRIDE_EMAIL, 'siphiwesmall79@gmail.com'];

/**
 * Returns the hospital name to display for a form submission.
 * For KG Moropane (admin account or linked Gmail), always returns the
 * overridden hospital name; for everyone else, returns the hospital captured
 * on the form (or 'N/A').
 */
export function getHospitalName(
  userEmail?: string | null,
  capturedHospital?: string | null,
): string {
  const email = (userEmail ?? '').toLowerCase().trim();
  if (KG_ACCOUNT_EMAILS.includes(email)) {
    return HOSPITAL_NAME;
  }
  return capturedHospital || 'N/A';
}

/**
 * Returns extra email recipients for a form submission.
 * Cases submitted by KG Moropane (admin account or linked Gmail) are also
 * copied to the admin address kgmoropane@winnysolutions.co.za.
 */
export function getAdminCopyRecipients(userEmail?: string | null): string[] {
  const email = (userEmail ?? '').toLowerCase().trim();
  return KG_ACCOUNT_EMAILS.includes(email) ? [HOSPITAL_OVERRIDE_EMAIL] : [];
}
