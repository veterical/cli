/* Copyright 2025 Veterical LLC */

import { fail, printJson, withJson } from '@monorepool/agentfirst/output.js'
import commander from 'commander'

import buildQuery from './buildQuery.js'
import __module1 from './formatOutput.js'
import parseBody from './parseBody.js'
import api from './request.js'
import resolveClinicId from './resolveClinicId.js'

const { dim, bold, cyan } = __module1

// Vaccination records drive the clinic's recall reminders: writing one with a
// `reminders` array schedules the recall jobs, and deleting one cancels them.
function vaccinationsCommand() {
  const command = new commander.Command('vaccinations')
  command.description(
    'manage vaccination records and their recalls (vaccinations:read /' +
      ' vaccinations:write)',
  )

  withJson(
    command
      .command('list')
      .description('list vaccination records (GET /api/vaccinations)')
      .option('--clinicId <clinicId>', 'only records of this clinic')
      .option('--clientId <clientId>', 'only records of this client')
      .option('--patientId <patientId>', 'only records of this patient')
      .option(
        '--appointmentId <appointmentId>',
        'only records created for this appointment',
      ),
  ).action(async options => {
    try {
      const vaccinations = await api.get(
        `/api/vaccinations${buildQuery({
          clinicId: options.clinicId,
          clientId: options.clientId,
          patientId: options.patientId,
          appointmentId: options.appointmentId,
        })}`,
      )

      if (options.json) {
        printJson(vaccinations)
        return
      }

      if (vaccinations.length === 0) {
        console.log('No vaccination records found')
        return
      }

      console.log(`Found ${vaccinations.length} vaccination(s):`)
      vaccinations.forEach((vaccination, index) => {
        const when = vaccination.administeredDate || ''
        console.log(
          `${index + 1}. ${vaccination.vaccine || '(no vaccine)'}` +
            `${when ? ` — ${when}` : ''} (${vaccination._id})`,
        )
      })
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('get <vaccinationId>')
      .description(
        'raw JSON for one record (GET /api/vaccinations/:vaccinationId)',
      ),
  ).action(async (vaccinationId, options) => {
    try {
      const vaccination = await api.get(`/api/vaccinations/${vaccinationId}`)
      printJson(vaccination)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('read <vaccinationId>')
      .description('read one vaccination record formatted for the terminal'),
  ).action(async (vaccinationId, options) => {
    try {
      const vaccination = await api.get(`/api/vaccinations/${vaccinationId}`)
      if (options.json) {
        printJson(vaccination)
        return
      }
      if (!vaccination) {
        console.log('Vaccination not found')
        return
      }
      console.log()
      console.log(bold(vaccination.vaccine || vaccination._id))
      console.log(dim(vaccination._id))
      console.log()
      if (vaccination.administeredDate) {
        console.log(
          `${cyan('administeredDate')}  ${vaccination.administeredDate}`,
        )
      }
      if (vaccination.nextDueDate) {
        console.log(`${cyan('nextDueDate')}  ${vaccination.nextDueDate}`)
      }
      if (vaccination.patientId) {
        console.log(`${cyan('patientId')}  ${vaccination.patientId}`)
      }
      if (vaccination.clientId) {
        console.log(`${cyan('clientId')}  ${vaccination.clientId}`)
      }
      if (vaccination.clinicId) {
        console.log(`${cyan('clinicId')}  ${vaccination.clinicId}`)
      }
      if (vaccination.reminders?.length) {
        console.log(`${cyan('reminders')}  ${vaccination.reminders.length}`)
      }
      console.log()
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('add')
      .description(
        'record a vaccination (POST /api/vaccinations, fires' +
          ' vaccination.created)',
      )
      .option('--patientId <patientId>', 'animal that was vaccinated')
      .option('--clientId <clientId>', 'client who owns the animal')
      .option(
        '--clinicId <clinicId>',
        'clinic the record belongs to (required unless an API key supplies it)',
      )
      .option('--vaccine <vaccine>', 'vaccine name')
      .option(
        '--administeredDate <administeredDate>',
        'date the vaccine was administered',
      )
      .option('--nextDueDate <nextDueDate>', 'date the recall is due')
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body',
      ),
  ).action(async options => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const vaccination = await api.post('/api/vaccinations', {
        ...body,
        ...(options.patientId && { patientId: options.patientId }),
        ...(options.clientId && { clientId: options.clientId }),
        ...(options.clinicId && { clinicId: options.clinicId }),
        ...(options.vaccine && { vaccine: options.vaccine }),
        ...(options.administeredDate && {
          administeredDate: options.administeredDate,
        }),
        ...(options.nextDueDate && { nextDueDate: options.nextDueDate }),
      })
      if (options.json) {
        printJson({ ok: true, id: vaccination._id })
        return
      }
      printJson(vaccination)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('update <vaccinationId>')
      .description(
        'update a vaccination record (PUT /api/vaccinations/:vaccinationId,' +
          ' fires vaccination.updated)',
      )
      .option('--patientId <patientId>', 'animal that was vaccinated')
      .option('--clientId <clientId>', 'client who owns the animal')
      .option('--clinicId <clinicId>', 'clinic the record belongs to')
      .option('--vaccine <vaccine>', 'vaccine name')
      .option(
        '--administeredDate <administeredDate>',
        'date the vaccine was administered',
      )
      .option('--nextDueDate <nextDueDate>', 'date the recall is due')
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body',
      ),
  ).action(async (vaccinationId, options) => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const clinicId = await resolveClinicId(options, body, () =>
        api.get(`/api/vaccinations/${vaccinationId}`),
      )
      const vaccination = await api.put(`/api/vaccinations/${vaccinationId}`, {
        ...body,
        _id: vaccinationId,
        ...(clinicId && { clinicId }),
        ...(options.patientId && { patientId: options.patientId }),
        ...(options.clientId && { clientId: options.clientId }),
        ...(options.vaccine && { vaccine: options.vaccine }),
        ...(options.administeredDate && {
          administeredDate: options.administeredDate,
        }),
        ...(options.nextDueDate && { nextDueDate: options.nextDueDate }),
      })
      if (options.json) {
        printJson({ ok: true, id: vaccination._id })
        return
      }
      printJson(vaccination)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('delete <vaccinationId...>')
      .description(
        'delete one or more vaccination records by id (DELETE' +
          ' /api/vaccinations/:vaccinationId — also cancels their recalls)',
      ),
  ).action(async (vaccinationIds, options) => {
    const deleted = []
    for (let index = 0; index < vaccinationIds.length; index += 1) {
      const vaccinationId = vaccinationIds[index]
      try {
        await api.del(`/api/vaccinations/${vaccinationId}`)
        deleted.push(vaccinationId)
        if (!options.json) {
          console.log(`deleted ${vaccinationId}`)
        }
      } catch (error) {
        fail(error, { json: options.json })
      }
    }
    if (options.json) {
      printJson({ ok: deleted.length === vaccinationIds.length, deleted })
    }
  })

  return command
}

export default vaccinationsCommand
