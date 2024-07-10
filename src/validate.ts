import Ajv from "ajv";

import promptSchema from "./schemas/prompt.schema.json" with { type: "json" };

const ajv = new Ajv.Ajv();
const schemas = new Map<string, Ajv.ValidateFunction>();
schemas.set("prompt", ajv.compile(promptSchema));

export function validateJson(schemaName: string, data: any): boolean {
  const validate = schemas.get(schemaName);
  // This should never happen unless the json schema fails to load
  if (!validate) throw "Schema not found";
  // Validate the data, log errors and throw if invalid
  if (!validate(data)) {
    console.error(validate.errors);
    return false;
  }
  return true;
}
