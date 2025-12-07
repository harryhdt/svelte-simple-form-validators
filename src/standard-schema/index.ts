import type { StandardSchemaV1 } from "@standard-schema/spec";
import { getDotPath } from "@standard-schema/utils";
import { FormContext } from "svelte-simple-form";

export function standardSchemaValidator<TInput, TOutput>(
  schema: StandardSchemaV1<TInput, TOutput>,
  options?: {
    dependencies?: Partial<Record<string, string[]>>;
  }
) {
  async function validate(values: any) {
    let result = schema["~standard"].validate(values);
    if (result instanceof Promise) result = await result;
    return result;
  }
  ``;
  function convertIssues(issues: any[]) {
    const errors: Record<string, string[]> = {};

    for (const issue of issues) {
      const path = getDotPath(issue) || "_form";
      (errors[path] ??= []).push(issue.message);
    }

    return errors;
  }

  let latestFormCall: symbol;
  const latestCall: Record<string, symbol> = {};

  function getFieldsToCheck(field: string) {
    return [field, ...(options?.dependencies?.[field] ?? [])];
  }

  return {
    async validateForm(form: FormContext) {
      form.setIsValidating(true);

      const callId = Symbol();
      latestFormCall = callId;

      form.setErrors({});

      const result = await validate(form.data);

      if (latestFormCall !== callId) return false;

      if (!result.issues) {
        form.setIsValidating(false);
        return true;
      }

      form.setErrors(convertIssues(result.issues as any));

      form.setIsValidating(false);

      return false;
    },

    async validateField(field: string, form: FormContext) {
      form.setIsValidating(true);

      const callId = Symbol();
      latestCall[field] = callId;

      const result = await validate(form.data);

      if (latestCall[field] !== callId) return false;

      if (!result.issues) {
        form.removeError(field);
        return true;
      }

      const errors = convertIssues(result.issues as any);
      const fieldsToCheck = getFieldsToCheck(field);
      let valid = true;

      for (const key of fieldsToCheck) {
        if (!form.touched[key]) continue;
        if (errors[key]) {
          valid = false;
          form.setError(key, errors[key]);
        } else {
          form.removeError(key);
        }
      }

      form.setIsValidating(false);

      return valid;
    },
  };
}
