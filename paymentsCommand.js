/* Copyright 2025 Veterical LLC */

import { fail, printJson, withJson } from '@monorepool/agentfirst/output.js'
import commander from 'commander'

import buildQuery from './buildQuery.js'
import __module1 from './formatOutput.js'
import parseBody from './parseBody.js'
import api from './request.js'
import resolveClinicId from './resolveClinicId.js'

const { dim, bold, cyan } = __module1

function paymentsCommand() {
  const command = new commander.Command('payments')
  command.description(
    'manage the payments recorded by the clinic (payments:read /' +
      ' payments:write)',
  )

  withJson(
    command
      .command('list')
      .description('list payments (GET /api/payments)')
      .option('--clinicId <clinicId>', 'only payments of this clinic')
      .option('--patientId <patientId>', 'only payments of this patient')
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
      const payments = await api.get(
        `/api/payments${buildQuery({
          clinicId: options.clinicId,
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
        printJson(payments)
        return
      }

      if (payments.length === 0) {
        console.log('No payments found')
        return
      }

      console.log(`Found ${payments.length} payment(s):`)
      payments.forEach((payment, index) => {
        console.log(
          `${index + 1}. ${payment.startTime || payment.creationTime || ''}` +
            ` (${payment._id})`,
        )
      })
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('get <paymentId>')
      .description('raw JSON for one payment (GET /api/payments/:paymentId)'),
  ).action(async (paymentId, options) => {
    try {
      const payment = await api.get(`/api/payments/${paymentId}`)
      printJson(payment)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('read <paymentId>')
      .description('read one payment formatted for the terminal'),
  ).action(async (paymentId, options) => {
    try {
      const payment = await api.get(`/api/payments/${paymentId}`)
      if (options.json) {
        printJson(payment)
        return
      }
      if (!payment) {
        console.log('Payment not found')
        return
      }
      console.log()
      console.log(bold(payment._id))
      console.log(dim(payment.clinicId || ''))
      console.log()
      if (payment.startTime) {
        console.log(`${cyan('startTime')}  ${payment.startTime}`)
      }
      if (payment.endTime) {
        console.log(`${cyan('endTime')}  ${payment.endTime}`)
      }
      if (payment.patientId) {
        console.log(`${cyan('patientId')}  ${payment.patientId}`)
      }
      if (payment.note) console.log(`${cyan('note')}  ${payment.note}`)
      if (payment.creationTime) {
        console.log(`${cyan('created')}  ${payment.creationTime}`)
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
        'record a payment (POST /api/payments, fires payment.created)',
      )
      .option('--patientId <patientId>', 'animal the payment relates to')
      .option(
        '--clinicId <clinicId>',
        'clinic the payment belongs to (required unless an API key supplies it)',
      )
      .option('--startTime <startTime>', 'ISO-8601 start of the covered period')
      .option('--endTime <endTime>', 'ISO-8601 end of the covered period')
      .option('--note <note>', 'free-text note')
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body',
      ),
  ).action(async options => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const payment = await api.post('/api/payments', {
        ...body,
        ...(options.patientId && { patientId: options.patientId }),
        ...(options.clinicId && { clinicId: options.clinicId }),
        ...(options.startTime && { startTime: options.startTime }),
        ...(options.endTime && { endTime: options.endTime }),
        ...(options.note && { note: options.note }),
      })
      if (options.json) {
        printJson({ ok: true, id: payment._id })
        return
      }
      printJson(payment)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('update <paymentId>')
      .description(
        'update a payment (PUT /api/payments/:paymentId, fires' +
          ' payment.updated)',
      )
      .option('--patientId <patientId>', 'animal the payment relates to')
      .option('--clinicId <clinicId>', 'clinic the payment belongs to')
      .option('--startTime <startTime>', 'ISO-8601 start of the covered period')
      .option('--endTime <endTime>', 'ISO-8601 end of the covered period')
      .option('--note <note>', 'free-text note')
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body',
      ),
  ).action(async (paymentId, options) => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const clinicId = await resolveClinicId(options, body, () =>
        api.get(`/api/payments/${paymentId}`),
      )
      const payment = await api.put(`/api/payments/${paymentId}`, {
        ...body,
        _id: paymentId,
        ...(clinicId && { clinicId }),
        ...(options.patientId && { patientId: options.patientId }),
        ...(options.startTime && { startTime: options.startTime }),
        ...(options.endTime && { endTime: options.endTime }),
        ...(options.note && { note: options.note }),
      })
      if (options.json) {
        printJson({ ok: true, id: payment._id })
        return
      }
      printJson(payment)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('delete <paymentId...>')
      .description(
        'delete one or more payments by id (DELETE /api/payments/:paymentId)',
      ),
  ).action(async (paymentIds, options) => {
    const deleted = []
    for (let index = 0; index < paymentIds.length; index += 1) {
      const paymentId = paymentIds[index]
      try {
        await api.del(`/api/payments/${paymentId}`)
        deleted.push(paymentId)
        if (!options.json) {
          console.log(`deleted ${paymentId}`)
        }
      } catch (error) {
        fail(error, { json: options.json })
      }
    }
    if (options.json) {
      printJson({ ok: deleted.length === paymentIds.length, deleted })
    }
  })

  return command
}

export default paymentsCommand
