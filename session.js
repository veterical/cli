/* Copyright 2025 Veterical LLC */
import createSessionStore from '@monorepool/agentfirst/sessionStore.js'

// ~/.veterical/ holds both credential kinds: the accessToken + refreshToken
// pair a browser login writes, and the apiKeySecret `login --with-key`
// stores. The directory is only created on first use — `veterical --help`
// leaves nothing behind.
export default createSessionStore({ productDirName: 'veterical' })
