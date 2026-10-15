/* Copyright 2025 Veterical LLC */

// Production Veterical API. Override with VETERICAL_API_URL for staging/dev.
//
// Deliberately not @veterical/client's getUrl: that module pulls in
// @monorepool/env, which carries the internal product roster — it must never
// end up inside the public npm bundle.
export default function getApiUrl() {
  return process.env.VETERICAL_API_URL || 'https://api.veterical.com'
}
