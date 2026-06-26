/**
 * OTP bypass — yalnızca geliştirmede açık.
 * Production'da OTP_BYPASS_ENABLED=true env ile açılabilir (önerilmez).
 */
export const OTP_BYPASS_ENABLED =
  process.env.OTP_BYPASS_ENABLED === "true" ||
  (process.env.NODE_ENV !== "production" &&
    process.env.OTP_BYPASS_ENABLED !== "false");
