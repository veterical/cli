/* Copyright 2025 Veterical LLC */

import { fail, printJson, withJson } from '@monorepool/agentfirst/output.js'
import commander from 'commander'

import buildQuery from './buildQuery.js'
import __module1 from './formatOutput.js'
import parseBody from './parseBody.js'
import api from './request.js'
import resolveClinicId from './resolveClinicId.js'

const { dim, bold, cyan } = __module1

// A patient is the animal. It belongs to a client — the human owner — so
// creates normally carry the owner's clientId.
function patientsCommand() {
  const command = new commander.Command('patients')
  command.description(
    'manage the patients — the animals themselves (patients:read /' +
      ' patients:write)',
  )

  withJson(
    command
      .command('list')
      .description('list patients (GET /api/patients)')
      .option('--clinicId <clinicId>', 'only patients of this clinic')
      .option('--email <email>', 'only patients with this exact email')
      .option('--userId <userId>', 'only patients linked to this user')
      .option('--ids <ids>', 'comma-separated patient ids to fetch')
      .option('--fields <fields>', 'comma-separated projection of fields'),
  ).action(async options => {
    try {
      const patients = await api.get(
        `/api/patients${buildQuery({
          clinicId: options.clinicId,
          email: options.email,
          userId: options.userId,
          _ids: options.ids,
          fields: options.fields,
        })}`,
      )

      if (options.json) {
        printJson(patients)
        return
      }

      if (patients.length === 0) {
        console.log('No patients found')
        return
      }

      console.log(`Found ${patients.length} patient(s):`)
      patients.forEach((patient, index) => {
        const traits = [patient.species, patient.breed]
          .filter(Boolean)
          .join(' · ')
        console.log(
          `${index + 1}. ${patient.name || patient._id}` +
            `${traits ? ` — ${traits}` : ''} (${patient._id})`,
        )
      })
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('get <patientId>')
      .description('raw JSON for one patient (GET /api/patients/:patientId)'),
  ).action(async (patientId, options) => {
    try {
      const patient = await api.get(`/api/patients/${patientId}`)
      printJson(patient)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('read <patientId>')
      .description('read one patient formatted for the terminal'),
  ).action(async (patientId, options) => {
    try {
      const patient = await api.get(`/api/patients/${patientId}`)
      if (options.json) {
        printJson(patient)
        return
      }
      if (!patient) {
        console.log('Patient not found')
        return
      }
      console.log()
      console.log(bold(patient.name || patient._id))
      console.log(dim(patient._id))
      console.log()
      if (patient.species) console.log(`${cyan('species')}  ${patient.species}`)
      if (patient.breed) console.log(`${cyan('breed')}  ${patient.breed}`)
      if (patient.sex) console.log(`${cyan('sex')}  ${patient.sex}`)
      if (patient.dateOfBirth) {
        console.log(`${cyan('dateOfBirth')}  ${patient.dateOfBirth}`)
      }
      if (patient.microchip) {
        console.log(`${cyan('microchip')}  ${patient.microchip}`)
      }
      if (patient.clientId) {
        console.log(`${cyan('clientId')}  ${patient.clientId}`)
      }
      if (patient.clinicId) {
        console.log(`${cyan('clinicId')}  ${patient.clinicId}`)
      }
      if (patient.creationTime) {
        console.log(`${cyan('created')}  ${patient.creationTime}`)
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
        'register a patient (POST /api/patients, fires patient.created)',
      )
      .requiredOption('--name <name>', "the animal's name")
      .option('--clientId <clientId>', 'client who owns this animal')
      .option(
        '--clinicId <clinicId>',
        'clinic the patient belongs to (required unless an API key supplies it)',
      )
      .option('--species <species>', 'species, e.g. dog')
      .option('--breed <breed>', 'breed, e.g. Labrador Retriever')
      .option('--sex <sex>', 'sex, e.g. female')
      .option('--dateOfBirth <dateOfBirth>', 'date of birth, e.g. 2021-04-18')
      .option('--microchip <microchip>', 'microchip number')
      .option('--note <note>', 'free-text note')
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body',
      ),
  ).action(async options => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const patient = await api.post('/api/patients', {
        ...body,
        name: options.name,
        ...(options.clientId && { clientId: options.clientId }),
        ...(options.clinicId && { clinicId: options.clinicId }),
        ...(options.species && { species: options.species }),
        ...(options.breed && { breed: options.breed }),
        ...(options.sex && { sex: options.sex }),
        ...(options.dateOfBirth && { dateOfBirth: options.dateOfBirth }),
        ...(options.microchip && { microchip: options.microchip }),
        ...(options.note && { note: options.note }),
      })
      if (options.json) {
        printJson({ ok: true, id: patient._id })
        return
      }
      printJson(patient)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('update <patientId>')
      .description(
        'update a patient (PUT /api/patients/:patientId, fires patient.updated)',
      )
      .option('--name <name>', "the animal's name")
      .option('--clientId <clientId>', 'client who owns this animal')
      .option('--clinicId <clinicId>', 'clinic the patient belongs to')
      .option('--species <species>', 'species, e.g. dog')
      .option('--breed <breed>', 'breed, e.g. Labrador Retriever')
      .option('--sex <sex>', 'sex, e.g. female')
      .option('--dateOfBirth <dateOfBirth>', 'date of birth, e.g. 2021-04-18')
      .option('--microchip <microchip>', 'microchip number')
      .option('--note <note>', 'free-text note')
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body',
      ),
  ).action(async (patientId, options) => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const clinicId = await resolveClinicId(options, body, () =>
        api.get(`/api/patients/${patientId}`),
      )
      const patient = await api.put(`/api/patients/${patientId}`, {
        ...body,
        _id: patientId,
        ...(clinicId && { clinicId }),
        ...(options.name && { name: options.name }),
        ...(options.clientId && { clientId: options.clientId }),
        ...(options.species && { species: options.species }),
        ...(options.breed && { breed: options.breed }),
        ...(options.sex && { sex: options.sex }),
        ...(options.dateOfBirth && { dateOfBirth: options.dateOfBirth }),
        ...(options.microchip && { microchip: options.microchip }),
        ...(options.note && { note: options.note }),
      })
      if (options.json) {
        printJson({ ok: true, id: patient._id })
        return
      }
      printJson(patient)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('delete <patientId...>')
      .description(
        'delete one or more patients by id (DELETE /api/patients/:patientId)',
      ),
  ).action(async (patientIds, options) => {
    const deleted = []
    for (let index = 0; index < patientIds.length; index += 1) {
      const patientId = patientIds[index]
      try {
        await api.del(`/api/patients/${patientId}`)
        deleted.push(patientId)
        if (!options.json) {
          console.log(`deleted ${patientId}`)
        }
      } catch (error) {
        fail(error, { json: options.json })
      }
    }
    if (options.json) {
      printJson({ ok: deleted.length === patientIds.length, deleted })
    }
  })

  return command
}

export default patientsCommand
