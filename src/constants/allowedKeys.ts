export const ALLOWED_KEYS = [
  "start",
  "contact_button",
  "already_signed",
  "invalid_phone",
  "cooldown",
  "progress_alert",
  "code_request",
  "code_invalid",
  "code_too_many_attempts",
  "code_expired",
  "password_request",
  "password_invalid",
  "password_too_many_attempts",
  "success",
  "unknown_error",
] as const;

export type AllowedKey = (typeof ALLOWED_KEYS)[number];
