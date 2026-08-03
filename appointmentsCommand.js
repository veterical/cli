/* Copyright 2025 Veterical LLC */
const commander = require('commander')
const {
  printJson,
  withJson,
  fail,
} = require('@monorepool/agentfirst/output.js')
const buildQuery = require('./buildQuery.js')
const parseBody = require('./parseBody.js')
const api = require('./request.js')
const resolveClinicId = require('./resolveClinicId.js')
const { dim, bold, cyan } = require('./formatOutput.js')

const STATUSES = ['SCHEDULED', 'CLIENT_ARRIVED', 'NO_SHOW', 'CANCELED']

function appointmentsCommand() {
  const command = new commander.Command('appointments')
  command.description(
    'manage the visits in the clinic calendar (appointments:read /' +
      ' appointments:write)',
  )

  withJson(
    command
      .command('list')
      .description('list appointments (GET /api/appointments)')
      .option('--clinicId <clinicId>', 'only appointments of this clinic')
      .option('--clientId <clientId>', 'only appointments of this client')
      .option('--patientId <patientId>', 'only appointments of this patient')
      .option(
        '--startTime <startTime>',
        'ISO-8601 lower bound on startTime (inclusive)',
      )
      .option(
        '--endTime <endTime>',
        'ISO-8601 upper bound on endTime (exclusive)',
      )
      .option('-n, --limit <limit>', 'max results (0 = no limit)')
      .option('--skip <skip>', 'skip the first N results')
      .option('--sortField <sortField>', 'field to sort by, e.g. startTime')
      .option('--sortDirection <sortDirection>', 'ASC or DESC', 'DESC')
      .option('--fields <fields>', 'comma-separated projection of fields'),
  ).action(async options => {
    try {
      const appointments = await api.get(
        `/api/appointments${buildQuery({
          clinicId: options.clinicId,
          clientId: options.clientId,
          patientId: options.patientId,
          startTime: options.startTime,
          endTime: options.endTime,
          limit: options.limit,
          skip: options.skip,
          sortField: options.sortField,
          sortDirection: options.sortDirection,
          fields: options.fields,
        })}`,
      )

      if (options.json) {
        printJson(appointments)
        return
      }

      if (appointments.length === 0) {
        console.log('No appointments found')
        return
      }

      console.log(`Found ${appointments.length} appointment(s):`)
      appointments.forEach((appointment, index) => {
        const when = [appointment.startTime, appointment.endTime]
          .filter(Boolean)
          .join(' → ')
        console.log(
          `${index + 1}. ${when || '(no time)'}` +
            `${appointment.status ? ` [${appointment.status}]` : ''}` +
            ` (${appointment._id})`,
        )
      })
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('get <appointmentId>')
      .description(
        'raw JSON for one appointment (GET /api/appointments/:appointmentId)',
      ),
  ).action(async (appointmentId, options) => {
    try {
      const appointment = await api.get(`/api/appointments/${appointmentId}`)
      printJson(appointment)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('read <appointmentId>')
      .description('read one appointment formatted for the terminal'),
  ).action(async (appointmentId, options) => {
    try {
      const appointment = await api.get(`/api/appointments/${appointmentId}`)
      if (options.json) {
        printJson(appointment)
        return
      }
      if (!appointment) {
        console.log('Appointment not found')
        return
      }
      console.log()
      console.log(bold(appointment.title || appointment._id))
      console.log(dim(appointment._id))
      console.log()
      if (appointment.startTime) {
        console.log(`${cyan('startTime')}  ${appointment.startTime}`)
      }
      if (appointment.endTime) {
        console.log(`${cyan('endTime')}  ${appointment.endTime}`)
      }
      if (appointment.status) {
        console.log(`${cyan('status')}  ${appointment.status}`)
      }
      if (appointment.clientId) {
        console.log(`${cyan('clientId')}  ${appointment.clientId}`)
      }
      if (appointment.patientId) {
        console.log(`${cyan('patientId')}  ${appointment.patientId}`)
      }
      if (appointment.clinicId) {
        console.log(`${cyan('clinicId')}  ${appointment.clinicId}`)
      }
      if (appointment.note) {
        console.log(`${cyan('note')}  ${appointment.note}`)
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
        'book an appointment (POST /api/appointments, fires' +
          ' appointment.created)',
      )
      .requiredOption('--startTime <startTime>', 'ISO-8601 start time')
      .option('--endTime <endTime>', 'ISO-8601 end time')
      .option('--clientId <clientId>', 'client the visit is booked for')
      .option('--patientId <patientId>', 'animal the visit is for')
      .option(
        '--clinicId <clinicId>',
        'clinic the visit belongs to (required unless an API key supplies it)',
      )
      .option('--status <status>', `one of ${STATUSES.join(', ')}`)
      .option('--title <title>', 'appointment title')
      .option('--note <note>', 'free-text note')
      .option('--body <json>', 'extra JSON fields merged into the request body'),
  ).action(async options => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const appointment = await api.post('/api/appointments', {
        ...body,
        startTime: options.startTime,
        ...(options.endTime && { endTime: options.endTime }),
        ...(options.clientId && { clientId: options.clientId }),
        ...(options.patientId && { patientId: options.patientId }),
        ...(options.clinicId && { clinicId: options.clinicId }),
        ...(options.status && { status: options.status }),
        ...(options.title && { title: options.title }),
        ...(options.note && { note: options.note }),
      })
      if (options.json) {
        printJson({ ok: true, id: appointment._id })
        return
      }
      printJson(appointment)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('update <appointmentId>')
      .description(
        'update an appointment (PUT /api/appointments/:appointmentId, fires' +
          ' appointment.updated)',
      )
      .option('--startTime <startTime>', 'ISO-8601 start time')
      .option('--endTime <endTime>', 'ISO-8601 end time')
      .option('--clientId <clientId>', 'client the visit is booked for')
      .option('--patientId <patientId>', 'animal the visit is for')
      .option('--clinicId <clinicId>', 'clinic the visit belongs to')
      .option('--status <status>', `one of ${STATUSES.join(', ')}`)
      .option('--title <title>', 'appointment title')
      .option('--note <note>', 'free-text note')
      .option('--body <json>', 'extra JSON fields merged into the request body'),
  ).action(async (appointmentId, options) => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const clinicId = await resolveClinicId(options, body, () =>
        api.get(`/api/appointments/${appointmentId}`),
      )
      const appointment = await api.put(
        `/api/appointments/${appointmentId}`,
        {
          ...body,
          _id: appointmentId,
          ...(clinicId && { clinicId }),
          ...(options.startTime && { startTime: options.startTime }),
          ...(options.endTime && { endTime: options.endTime }),
          ...(options.clientId && { clientId: options.clientId }),
          ...(options.patientId && { patientId: options.patientId }),
          ...(options.status && { status: options.status }),
          ...(options.title && { title: options.title }),
          ...(options.note && { note: options.note }),
        },
      )
      if (options.json) {
        printJson({ ok: true, id: appointment._id })
        return
      }
      printJson(appointment)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('delete <appointmentId...>')
      .description(
        'delete one or more appointments by id (DELETE' +
          ' /api/appointments/:appointmentId, fires appointment.deleted)',
      ),
  ).action(async (appointmentIds, options) => {
    const deleted = []
    for (let index = 0; index < appointmentIds.length; index += 1) {
      const appointmentId = appointmentIds[index]
      try {
        await api.del(`/api/appointments/${appointmentId}`)
        deleted.push(appointmentId)
        if (!options.json) {
          console.log(`deleted ${appointmentId}`)
        }
      } catch (error) {
        fail(error, { json: options.json })
      }
    }
    if (options.json) {
      printJson({ ok: deleted.length === appointmentIds.length, deleted })
    }
  })

  return command
}

module.exports = appointmentsCommand
