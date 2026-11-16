/** Emails are stored and compared lowercase: `Ana@x.com` and `ana@x.com` are one account. */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** Prisma filter matching [email] regardless of case (rows created before normalization). */
export const emailEquals = (email: string) => ({
  equals: normalizeEmail(email),
  mode: "insensitive" as const,
});
