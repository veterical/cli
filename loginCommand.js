/* Copyright 2025 Veterical LLC */
const loginCommand = require('@monorepool/agentfirst/loginCommand.js')
const api = require('./request.js')
const session = require('./session.js')
const { binaryName, appUrl, envKeyName } = require('./constants.js')

// Verifies a pasted key with the cheapest read the API offers. New keys
// start with every :read scope, so clients:read is normally present.
// Resolving (instead of throwing) on a scope gap keeps a narrowly-scoped
// key stored — a missing scope is a permissions choice, not a bad secret.
async function verify() {
  try {
    const clients = await api.get('/api/clients?fields=_id')

    return `Logged in — ${clients.length} client(s) visible with this key.`
  } catch (error) {
    if (error.status === 403 && String(error.message).includes('scope')) {
      return (
        'Key stored. It lacks the clients:read scope, so it could not be' +
        ' verified — commands within its granted scopes will still work.'
      )
    }

    if (error.status === 401 || error.status === 403) {
      throw error
    }

    return `Key stored, but the verification call failed: ${error.message}`
  }
}

// `veterical login` — dual-mode via the shared factory: `--browser` opens
// app.veterical.com/cli and stores a token session; `--with-key` prompts
// (masked) for an API key secret. Headless with no flags it fails fast
// with instructions instead of hanging on a prompt or opening a browser.
module.exports = () =>
  loginCommand({ binaryName, appUrl, session, verify, envKeyName })
