// The published exchange schemas (vendor/exchange, from Triodian_Metamodel exchange/; task R.4), for the tests.
import { readFileSync, readdirSync } from 'node:fs';
import Ajv from 'ajv';

const DIR = new URL('../../vendor/exchange/', import.meta.url);
const ajv = new Ajv({ allErrors: true, strict: false });
for (const f of readdirSync(DIR).filter(f => f.endsWith('.schema.json'))) ajv.addSchema(JSON.parse(readFileSync(new URL(f, DIR), 'utf8')), f);
/** The schema errors for data, as short lines; [] when it conforms. */
export function exchangeErrors(schemaFile, data) {
  const v = ajv.getSchema(schemaFile); if (!v) return [`no vendored schema ${schemaFile}`];
  return v(data) ? [] : v.errors.map(e => `${e.instancePath || '/'} ${e.message}${e.params && e.params.additionalProperty ? ' (' + e.params.additionalProperty + ')' : ''}`);
}
export const fixture = name => JSON.parse(readFileSync(new URL('fixtures/' + name, import.meta.url), 'utf8'));
