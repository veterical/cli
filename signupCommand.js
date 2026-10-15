/* Copyright 2025 Veterical LLC */
import signupCommand from '@monorepool/agentfirst/signupCommand.js'

import __module1 from './constants.js'
import getApiUrl from './getApiUrl.js'
import session from './session.js'

const { binaryName, appUrl } = __module1

// The step that used to need a person. `login` assumes the account already
// exists; an agent pointed at veterical.com for the first time has nothing
// to log into, and the browser flow it fell back to blocked with nobody
// there to complete it.
//
//   veterical signup --email vet@example.com --json
//
// drives the same public POST /api/signup the web signup form posts to
// (Basic base64(email:password), no email-verification gate), then stores
// the returned token pair in the same ~/.veterical/ the browser login
// writes — so every other command works immediately afterwards. The signup
// also seeds the account's first clinic, which is what the resource
// commands below need a clinicId for.
export default () => signupCommand({ binaryName, getApiUrl, appUrl, session })
