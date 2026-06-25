/** Contact for privacy and legal enquiries. Override with LEGAL_CONTACT_EMAIL in production. */
export const LEGAL_CONTACT_EMAIL =
  process.env.LEGAL_CONTACT_EMAIL?.trim() || "privacy@crypticai.uk";

/** Shown at the top of legal pages — update when policies change materially. */
export const LEGAL_LAST_UPDATED = "25 June 2026";

export const LEGAL_OPERATOR_NAME =
  process.env.LEGAL_OPERATOR_NAME?.trim() || "Cryptic AI";
