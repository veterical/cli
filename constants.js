/* Copyright 2025 Veterical LLC */

// The per-product configuration every @monorepool/agentfirst factory needs.
//
// VETERICAL_API_KEY is read from the environment at request time; a stored
// login (browser session or pasted key) always wins over it, so a globally
// exported key cannot silently hijack an interactive session.
export default {
  binaryName: 'veterical',
  appUrl: 'https://app.veterical.com',
  envKeyName: 'VETERICAL_API_KEY',
}
