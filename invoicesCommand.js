/* Copyright 2025 Veterical LLC */

import { fail, printJson, withJson } from '@monorepool/agentfirst/output.js'
import commander from 'commander'

import buildQuery from './buildQuery.js'
import __module1 from './formatOutput.js'
import parseBody from './parseBody.js'
import api from './request.js'
import resolveClinicId from './resolveClinicId.js'

const { dim, bold, cyan } = __module1

const STATUSES = [
  'DRAFT',
  'PENDING',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'REFUNDED',
  'UNCOLLECTIBLE',
]

function invoicesCommand() {
  const command = new commander.Command('invoices')
  command.description(
    'manage the invoices of the clinic (invoices:read / invoices:write)',
  )

  withJson(
    command
      .command('list')
      .description('list invoices (GET /api/invoices)')
      .option('--clinicId <clinicId>', 'only invoices of this clinic')
      .option('--patientId <patientId>', 'only invoices of this patient')
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
      .option('--sortField <sortField>', 'field to sort by, e.g. invoiceTime')
      .option('--sortDirection <sortDirection>', 'ASC or DESC', 'DESC')
      .option('--fields <fields>', 'comma-separated projection of fields'),
  ).action(async options => {
    try {
      const invoices = await api.get(
        `/api/invoices${buildQuery({
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
        printJson(invoices)
        return
      }

      if (invoices.length === 0) {
        console.log('No invoices found')
        return
      }

      console.log(`Found ${invoices.length} invoice(s):`)
      invoices.forEach((invoice, index) => {
        const summary = [invoice.status, invoice.total]
          .filter(value => value !== undefined && value !== null)
          .join(' · ')
        console.log(
          `${index + 1}. ${invoice.invoiceTime || invoice.creationTime || ''}` +
            `${summary ? ` — ${summary}` : ''} (${invoice._id})`,
        )
      })
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('get <invoiceId>')
      .description('raw JSON for one invoice (GET /api/invoices/:invoiceId)'),
  ).action(async (invoiceId, options) => {
    try {
      const invoice = await api.get(`/api/invoices/${invoiceId}`)
      printJson(invoice)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('read <invoiceId>')
      .description('read one invoice formatted for the terminal'),
  ).action(async (invoiceId, options) => {
    try {
      const invoice = await api.get(`/api/invoices/${invoiceId}`)
      if (options.json) {
        printJson(invoice)
        return
      }
      if (!invoice) {
        console.log('Invoice not found')
        return
      }
      console.log()
      console.log(bold(invoice.patientName || invoice._id))
      console.log(dim(invoice._id))
      console.log()
      if (invoice.status) console.log(`${cyan('status')}  ${invoice.status}`)
      if (invoice.total !== undefined) {
        console.log(`${cyan('total')}  ${invoice.total}`)
      }
      if (invoice.invoiceTime) {
        console.log(`${cyan('invoiceTime')}  ${invoice.invoiceTime}`)
      }
      if (invoice.patientId) {
        console.log(`${cyan('patientId')}  ${invoice.patientId}`)
      }
      if (invoice.clinicId) {
        console.log(`${cyan('clinicId')}  ${invoice.clinicId}`)
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
        'create an invoice (POST /api/invoices, fires invoice.created)',
      )
      .option('--patientId <patientId>', 'animal the invoice is for')
      .option(
        '--clinicId <clinicId>',
        'clinic the invoice belongs to (required unless an API key supplies it)',
      )
      .option('--status <status>', `one of ${STATUSES.join(', ')}`)
      .option('--total <total>', 'invoice total in the clinic currency')
      .option('--invoiceTime <invoiceTime>', 'ISO-8601 invoice time')
      .option('--note <note>', 'free-text note')
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body',
      ),
  ).action(async options => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const invoice = await api.post('/api/invoices', {
        ...body,
        ...(options.patientId && { patientId: options.patientId }),
        ...(options.clinicId && { clinicId: options.clinicId }),
        ...(options.status && { status: options.status }),
        ...(options.total && { total: Number(options.total) }),
        ...(options.invoiceTime && { invoiceTime: options.invoiceTime }),
        ...(options.note && { note: options.note }),
      })
      if (options.json) {
        printJson({ ok: true, id: invoice._id })
        return
      }
      printJson(invoice)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('update <invoiceId>')
      .description(
        'update an invoice (PUT /api/invoices/:invoiceId, fires' +
          ' invoice.updated)',
      )
      .option('--patientId <patientId>', 'animal the invoice is for')
      .option('--clinicId <clinicId>', 'clinic the invoice belongs to')
      .option('--status <status>', `one of ${STATUSES.join(', ')}`)
      .option('--total <total>', 'invoice total in the clinic currency')
      .option('--invoiceTime <invoiceTime>', 'ISO-8601 invoice time')
      .option('--note <note>', 'free-text note')
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body',
      ),
  ).action(async (invoiceId, options) => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const clinicId = await resolveClinicId(options, body, () =>
        api.get(`/api/invoices/${invoiceId}`),
      )
      const invoice = await api.put(`/api/invoices/${invoiceId}`, {
        ...body,
        _id: invoiceId,
        ...(clinicId && { clinicId }),
        ...(options.patientId && { patientId: options.patientId }),
        ...(options.status && { status: options.status }),
        ...(options.total && { total: Number(options.total) }),
        ...(options.invoiceTime && { invoiceTime: options.invoiceTime }),
        ...(options.note && { note: options.note }),
      })
      if (options.json) {
        printJson({ ok: true, id: invoice._id })
        return
      }
      printJson(invoice)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('delete <invoiceId...>')
      .description(
        'delete one or more invoices by id (DELETE /api/invoices/:invoiceId)',
      ),
  ).action(async (invoiceIds, options) => {
    const deleted = []
    for (let index = 0; index < invoiceIds.length; index += 1) {
      const invoiceId = invoiceIds[index]
      try {
        await api.del(`/api/invoices/${invoiceId}`)
        deleted.push(invoiceId)
        if (!options.json) {
          console.log(`deleted ${invoiceId}`)
        }
      } catch (error) {
        fail(error, { json: options.json })
      }
    }
    if (options.json) {
      printJson({ ok: deleted.length === invoiceIds.length, deleted })
    }
  })

  return command
}

export default invoicesCommand
