/* Copyright 2025 Veterical LLC */

// Every write handler in veterical/api requires a clinicId. An API key is
// issued for one clinic and supplies it server-side from the key document, so
// a key-authenticated caller never has to send one. A browser session is
// organization-wide, so it must. On update, when the caller passed no
// --clinicId, reuse the clinicId of the existing record (costs one extra
// read, and therefore the matching :read scope).
export default async function resolveClinicId(options, body, getExisting) {
  let clinicId = options.clinicId || body.clinicId

  if (!clinicId) {
    const existing = await getExisting()
    clinicId = existing?.clinicId
  }

  return clinicId
}
