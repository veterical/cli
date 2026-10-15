/* Copyright 2025 Veterical LLC */

import { fail, printJson, withJson } from '@monorepool/agentfirst/output.js'
import commander from 'commander'

import buildQuery from './buildQuery.js'
import __module1 from './formatOutput.js'
import parseBody from './parseBody.js'
import api from './request.js'
import resolveClinicId from './resolveClinicId.js'

const { dim, bold, cyan } = __module1

// In veterical a client is the human who owns the animal; the animal itself
// is a patient. Every patient belongs to a client.
function clientsCommand() {
  const command = new commander.Command('clients')
  command.description(
    'manage the clients — the people who own the animals (clients:read /' +
      ' clients:write)',
  )

  withJson(
    command
      .command('list')
      .description('list clients (GET /api/clients)')
      .option('--clinicId <clinicId>', 'only clients of this clinic')
      .option('--email <email>', 'only clients with this exact email')
      .option('--userId <userId>', 'only clients linked to this user')
      .option('--ids <ids>', 'comma-separated client ids to fetch')
      .option('--fields <fields>', 'comma-separated projection of fields'),
  ).action(async options => {
    try {
      const clients = await api.get(
        `/api/clients${buildQuery({
          clinicId: options.clinicId,
          email: options.email,
          userId: options.userId,
          _ids: options.ids,
          fields: options.fields,
        })}`,
      )

      if (options.json) {
        printJson(clients)
        return
      }

      if (clients.length === 0) {
        console.log('No clients found')
        return
      }

      console.log(`Found ${clients.length} client(s):`)
      clients.forEach((client, index) => {
        const contact = [client.email, client.phone].filter(Boolean).join(' · ')
        console.log(
          `${index + 1}. ${client.name || client._id}` +
            `${contact ? ` — ${contact}` : ''} (${client._id})`,
        )
      })
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('get <clientId>')
      .description('raw JSON for one client (GET /api/clients/:clientId)'),
  ).action(async (clientId, options) => {
    try {
      const client = await api.get(`/api/clients/${clientId}`)
      printJson(client)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('read <clientId>')
      .description('read one client formatted for the terminal'),
  ).action(async (clientId, options) => {
    try {
      const client = await api.get(`/api/clients/${clientId}`)
      if (options.json) {
        printJson(client)
        return
      }
      if (!client) {
        console.log('Client not found')
        return
      }
      console.log()
      console.log(bold(client.name || client._id))
      console.log(dim(client._id))
      console.log()
      if (client.email) console.log(`${cyan('email')}  ${client.email}`)
      if (client.phone) console.log(`${cyan('phone')}  ${client.phone}`)
      if (client.language) {
        console.log(`${cyan('language')}  ${client.language}`)
      }
      if (client.clinicId) {
        console.log(`${cyan('clinicId')}  ${client.clinicId}`)
      }
      if (client.creationTime) {
        console.log(`${cyan('created')}  ${client.creationTime}`)
      }
      console.log()
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('add')
      .description('create a client (POST /api/clients, fires client.created)')
      .requiredOption('--name <name>', 'client full name')
      .option(
        '--clinicId <clinicId>',
        'clinic the client belongs to (required unless an API key supplies it)',
      )
      .option('--email <email>', 'client email')
      .option('--phone <phone>', 'client phone number')
      .option('--language <language>', 'two-letter language code, e.g. en')
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body',
      ),
  ).action(async options => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const client = await api.post('/api/clients', {
        ...body,
        name: options.name,
        ...(options.clinicId && { clinicId: options.clinicId }),
        ...(options.email && { email: options.email }),
        ...(options.phone && { phone: options.phone }),
        ...(options.language && { language: options.language }),
      })
      if (options.json) {
        printJson({ ok: true, id: client._id })
        return
      }
      printJson(client)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('update <clientId>')
      .description(
        'update a client (PUT /api/clients/:clientId, fires client.updated)',
      )
      .option('--name <name>', 'client full name')
      .option('--email <email>', 'client email')
      .option('--phone <phone>', 'client phone number')
      .option('--language <language>', 'two-letter language code, e.g. en')
      .option('--clinicId <clinicId>', 'clinic the client belongs to')
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body',
      ),
  ).action(async (clientId, options) => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const clinicId = await resolveClinicId(options, body, () =>
        api.get(`/api/clients/${clientId}`),
      )
      const client = await api.put(`/api/clients/${clientId}`, {
        ...body,
        _id: clientId,
        ...(clinicId && { clinicId }),
        ...(options.name && { name: options.name }),
        ...(options.email && { email: options.email }),
        ...(options.phone && { phone: options.phone }),
        ...(options.language && { language: options.language }),
      })
      if (options.json) {
        printJson({ ok: true, id: client._id })
        return
      }
      printJson(client)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('delete <clientId...>')
      .description(
        'delete one or more clients by id (DELETE /api/clients/:clientId)',
      ),
  ).action(async (clientIds, options) => {
    const deleted = []
    for (let index = 0; index < clientIds.length; index += 1) {
      const clientId = clientIds[index]
      try {
        await api.del(`/api/clients/${clientId}`)
        deleted.push(clientId)
        if (!options.json) {
          console.log(`deleted ${clientId}`)
        }
      } catch (error) {
        fail(error, { json: options.json })
      }
    }
    if (options.json) {
      printJson({ ok: deleted.length === clientIds.length, deleted })
    }
  })

  return command
}

export default clientsCommand
