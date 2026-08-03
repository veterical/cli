/* Copyright 2025 Veterical LLC */
const createSessionStore = require('@monorepool/agentfirst/sessionStore.js')

// ~/.veterical/ holds both credential kinds: the accessToken + refreshToken
// pair a browser login writes, and the apiKeySecret `login --with-key`
// stores. The directory is only created on first use — `veterical --help`
// leaves nothing behind.
module.exports = createSessionStore({ productDirName: 'veterical' })
