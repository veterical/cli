#!/usr/bin/env node
/* Copyright 2025 Veterical LLC */
const program = require('commander')
const skillsCommand = require('@monorepool/agentfirst/skillsCommand.js')
const appointmentsCommand = require('./appointmentsCommand.js')
const clientsCommand = require('./clientsCommand.js')
const invoicesCommand = require('./invoicesCommand.js')
const loginCommand = require('./loginCommand.js')
const logoutCommand = require('./logoutCommand.js')
const patientsCommand = require('./patientsCommand.js')
const paymentsCommand = require('./paymentsCommand.js')
const schemaCommand = require('./schemaCommand.js')
const signupCommand = require('./signupCommand.js')
const vaccinationsCommand = require('./vaccinationsCommand.js')
const packageJson = require('./package.json')

program
  .name('veterical')
  .description(
    'veterical cli — manage the clients, patients, appointments, invoices,' +
      ' payments and vaccinations of your veterinary clinic from the terminal',
  )
  .version(packageJson.version)
  .addCommand(signupCommand())
  .addCommand(loginCommand())
  .addCommand(logoutCommand())
  .addCommand(clientsCommand())
  .addCommand(patientsCommand())
  .addCommand(appointmentsCommand())
  .addCommand(invoicesCommand())
  .addCommand(paymentsCommand())
  .addCommand(vaccinationsCommand())
  // baseDirectory must be this file's directory: the shared factory resolves
  // the bundled skills/ relative to it (dist/index.js → ../skills).
  .addCommand(skillsCommand({ baseDirectory: __dirname }))

// `schema` describes the assembled program, itself included, so it is added
// after every other command is registered and before parsing.
program.addCommand(schemaCommand(program))
program.parse(process.argv)
