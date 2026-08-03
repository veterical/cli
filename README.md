# veterical

Command-line access to your [Veterical](https://www.veterical.com/) data on
[app.veterical.com](https://app.veterical.com): the clients who own the
animals, the patients (the animals themselves), appointments, invoices,
payments and vaccination records — the same records the clinic dashboard
shows, through the Veterical REST API at `https://api.veterical.com`.

Two of the nouns are easy to mix up: a **client** is the human owner and a
**patient** is the animal, so a patient always belongs to a client.

## Install

```bash
npm install -g veterical   # global install
npx veterical --help       # or run without installing
```

Requires Node.js 18 or newer.

## Quick start

```bash
veterical login                          # choose browser or API key login
veterical clients list -n 10             # the owners on file
veterical patients list --fields name,species
veterical appointments list --startTime 2026-08-01T00:00:00.000Z
```

```
Found 2 client(s):
1. Michael Brooks — 5559081726 (1c4b647c69645e637c2968eb)
2. Sara Neri — sara@example.com (2dc60c043e51a32678787325)
```

## Signing up

No account yet? Create one from the terminal — the generated password prints
exactly once, the first clinic is seeded for you, and the session is stored so
every other command works immediately:

```bash
veterical signup --email vet@example.com --json
```

## Authentication

Two ways in, both stored in `~/.veterical/`:

- **Browser** — `veterical login --browser` opens
  [app.veterical.com](https://app.veterical.com) in your browser to log in
  with your Veterical account, then stores a token session. Tokens are
  refreshed automatically; requests carry `Authorization: Token base64(<jwt>)`.
  A browser session is organization-wide, so it reaches every clinic of the
  organization — and has to name one with `--clinicId` on writes.
- **API key** — `veterical login --with-key` prompts for an API key secret
  with a masked input. An administrator of your organization creates the key
  in the Veterical dashboard, on the clinic page under **API keys**. The
  secret is shown **once**, when the key is created, and never again — store
  it somewhere safe. It is never accepted as a command-line argument, so it
  cannot leak into your shell history. Requests carry
  `Authorization: Basic base64(<key secret>)` — the secret alone, with no
  username and no colon. A key belongs to exactly one clinic, which is then
  implied on every call.

Plain `veterical login` in a terminal asks which method to use.
`veterical logout` deletes everything stored in `~/.veterical/`.

**Headless / CI / agents** — export `VETERICAL_API_KEY=<key secret>` and skip
`login` entirely: every command reads it at request time. When several
credentials exist the precedence is: stored browser session, then stored key,
then the environment variable — a stored login always wins over an exported
key, so a globally exported `VETERICAL_API_KEY` never hijacks an interactive
session.

Without a terminal the CLI never hangs and never opens a browser:
`veterical login` (and any command run without credentials) fails immediately
with exit code 1 and instructions on stderr.

### Scopes

Each API key carries per-resource scopes: `clients:read`, `clients:write`,
`patients:read`, `patients:write`, `appointments:read`,
`appointments:write`, `invoices:read`, `invoices:write`, `payments:read`,
`payments:write`, `vaccinations:read` and `vaccinations:write`. New keys
start read-only; an administrator widens them in the dashboard. A command
hitting a scope the key lacks fails with `403`. Requests are rate limited per
key; going over the limit returns `429`. Reading a record that belongs to
another clinic returns `404` rather than `403`, so ids cannot be probed.

Users, roles, invites, clinics, quotes, documents, templates, preferences,
printers and subscriptions are deliberately outside the key vocabulary and
cannot be reached with an API key at all.

## JSON output

Every subcommand accepts `--json` and prints real, parseable JSON on stdout —
plain `JSON.stringify`, no colors. Without the flag, `list` and `read` print
human summaries. Mutations with `--json` print a small result object:
`{ "ok": true, "id": "…" }` for `add`/`update`,
`{ "ok": true, "deleted": ["…"] }` for `delete`.

Errors always go to stderr with exit code 1; with `--json` the error is a
single JSON line — `{"error":{"message":"…","status":404}}` — so stdout stays
clean for parsing.

```bash
veterical clients list --json --fields _id,name,email | jq '.[] | {id: ._id, name}'
```

## Commands

### Session

```bash
veterical signup --email vet@example.com   # create an account and log in
veterical login                            # interactive: browser or API key
veterical login --browser                  # log in through app.veterical.com
veterical login --with-key                 # prompt for an API key secret (masked)
veterical logout                           # clear everything in ~/.veterical/
```

### Schema

```bash
veterical schema                # the whole command tree as JSON
veterical schema clients list   # one subtree: its options and arguments
```

Machine-readable discovery of every command, option, and argument — for agents
and scripts that would otherwise scrape `--help` text.

### Clients — the animal owners

```bash
veterical clients list                              # --json for raw output
veterical clients list --clinicId <clinicId>        # one clinic only
veterical clients list --email jane@example.com     # exact-email lookup
veterical clients list --ids <id1,id2>              # fetch specific ids
veterical clients list --fields name,email,phone    # project fields
veterical clients get <clientId>                    # raw JSON for one client
veterical clients read <clientId>                   # formatted view
veterical clients add --name "Jane Fonda" --email jane@example.com \
  --phone 5551234567 --clinicId <clinicId>
veterical clients update <clientId> --phone 5559876543
veterical clients update <clientId> --body '{"language":"it"}'
veterical clients delete <clientId...>              # one or more ids
```

### Patients — the animals

```bash
veterical patients list                             # --clinicId, --ids, --fields
veterical patients get <patientId>                  # raw JSON for one patient
veterical patients read <patientId>                 # formatted view
veterical patients add --name Luna --clientId <clientId> --species dog \
  --breed "Labrador Retriever" --sex female --dateOfBirth 2021-04-18 \
  --clinicId <clinicId>
veterical patients update <patientId> --microchip 981000000000000
veterical patients delete <patientId...>            # one or more ids
```

### Appointments

```bash
veterical appointments list                         # --clinicId, --clientId, --patientId
veterical appointments list --startTime 2026-08-01T00:00:00.000Z \
  --endTime 2026-09-01T00:00:00.000Z                # ISO-8601 window
veterical appointments list --sortField startTime --sortDirection ASC -n 50
veterical appointments get <appointmentId>          # raw JSON
veterical appointments read <appointmentId>         # formatted view
veterical appointments add --startTime 2026-08-10T14:00:00.000Z \
  --endTime 2026-08-10T14:30:00.000Z --clientId <clientId> \
  --patientId <patientId> --clinicId <clinicId>
veterical appointments update <appointmentId> --status CANCELED
veterical appointments delete <appointmentId...>    # one or more ids
```

Appointment `--status` accepts `SCHEDULED`, `CLIENT_ARRIVED`, `NO_SHOW`, or
`CANCELED`. The window filter is start-inclusive and end-exclusive.

### Invoices

```bash
veterical invoices list                             # --clinicId, --patientId
veterical invoices list --startTime <iso> --endTime <iso> -n 50 --skip 0
veterical invoices get <invoiceId>                  # raw JSON
veterical invoices read <invoiceId>                 # formatted view
veterical invoices add --patientId <patientId> --status DRAFT --total 120 \
  --clinicId <clinicId>
veterical invoices update <invoiceId> --status PAID
veterical invoices delete <invoiceId...>            # one or more ids
```

Invoice `--status` accepts `DRAFT`, `PENDING`, `PARTIALLY_PAID`, `PAID`,
`OVERDUE`, `REFUNDED`, or `UNCOLLECTIBLE`.

### Payments

```bash
veterical payments list                             # --clinicId, --patientId
veterical payments list --startTime <iso> --endTime <iso> --sortField startTime
veterical payments get <paymentId>                  # raw JSON
veterical payments read <paymentId>                 # formatted view
veterical payments add --patientId <patientId> --clinicId <clinicId> \
  --startTime <iso> --note "card terminal"
veterical payments update <paymentId> --note "corrected"
veterical payments delete <paymentId...>            # one or more ids
```

These are the clinic's own bookkeeping records: writing one records money that
was already taken. Nothing here charges a card, captures, refunds, or moves
funds.

### Vaccinations

```bash
veterical vaccinations list                         # --clinicId, --clientId
veterical vaccinations list --patientId <patientId>
veterical vaccinations list --appointmentId <appointmentId>
veterical vaccinations get <vaccinationId>          # raw JSON
veterical vaccinations read <vaccinationId>         # formatted view
veterical vaccinations add --patientId <patientId> --clientId <clientId> \
  --vaccine Rabies --administeredDate 2026-07-01 --nextDueDate 2027-07-01 \
  --clinicId <clinicId>
veterical vaccinations update <vaccinationId> --nextDueDate 2027-08-01
veterical vaccinations delete <vaccinationId...>    # one or more ids
```

Vaccination records drive the clinic's recall reminders: a record carrying a
`reminders` array schedules recall jobs when written, changing `nextDueDate`
reschedules them, and deleting the record cancels them.

### Skills

```bash
veterical skills list             # names and descriptions of the bundled guides
veterical skills get veterical    # print a bundled SKILL.md to stdout
```

## Notes on writes

- Every create and update needs a clinic. An API key supplies its own clinic
  automatically; a browser session does not, so pass `--clinicId`. On
  `update`, when the flag is omitted, the CLI reads the record first and
  reuses its clinic — that path needs the matching `:read` scope too.
- `update` sends only the fields you pass (plus `--body` JSON); the API merges
  them into the stored record. Named options win over `--body` on conflict.
- Creates and updates fire the corresponding webhooks (`client.created`,
  `appointment.updated`, `vaccination.created`, …) for the clinic's webhook
  subscriptions, exactly as dashboard edits do.
- Deletes are permanent and accept multiple ids
  (`veterical clients delete <id1> <id2>`). Deleting an appointment also
  cancels its scheduled reminders.

## Configuration

`VETERICAL_API_URL` overrides the API endpoint (default
`https://api.veterical.com`) — only needed against a non-production
deployment. `VETERICAL_API_KEY` supplies an API key secret from the
environment for headless use. Stored credentials live only in `~/.veterical/`;
the CLI sends them to the Veterical API and nowhere else, and collects no
telemetry.

## Usage with AI agents

Install the Veterical agent skills for Claude Code, Cursor, Codex, and any
other agent that supports the Skills standard:

```bash
npx skills add veterical/skills
```

The CLI guide also ships inside the npm package, version-matched to the
installed CLI:

```bash
veterical skills list             # what is bundled
veterical skills get veterical    # the CLI guide matching this version
```

Or paste this into your `AGENTS.md` / `CLAUDE.md`:

```markdown
## Veterical

Use the `veterical` CLI for veterinary clinic data: clients (the owners),
patients (the animals), appointments, invoices, payments and vaccinations.
Run `npx veterical skills get veterical` for the full guide,
`veterical schema` for the command tree as JSON, and `veterical --help` for
the command reference. Log in once with `veterical login` (browser or API
key), or export VETERICAL_API_KEY for headless use. Every subcommand accepts
`--json`.
```

Prefer raw HTTP? The same API key authenticates the REST API directly —
`https://api.veterical.com` with `Authorization: Basic base64(<key secret>)`.
The generated endpoint reference lives at
[veterical.com/api](https://www.veterical.com/api/).

## License

[Apache-2.0](LICENSE)
