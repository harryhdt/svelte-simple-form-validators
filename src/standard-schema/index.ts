import type { FormControlContext } from "svelte-simple-form";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { getDotPath } from "@standard-schema/utils";

interface Options {
  dependencies?: Partial<Record<string, string[]>>;
}

export function standardSchemaValidator<TInput, TOutput>(
  schema: StandardSchemaV1<TInput, TOutput>,
  options: Options = {}
) {
  async function validate(values: any) {
    let result = schema["~standard"].validate(values);
    if (result instanceof Promise) result = await result;
    return result;
  }
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
    async validateForm(f: unknown) {
      const form = f as FormControlContext;
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

    async validateField(field: string, f: unknown, force = false) {
      const form = f as FormControlContext;
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

      for (const fieldKey of fieldsToCheck) {
        //
        // 1. Remove all previous errors for this field AND its children
        //    Do this FIRST and UNCONDITIONALLY.
        //
        for (const k of Object.keys(form.errors)) {
          if (k === fieldKey || k.startsWith(fieldKey + ".")) {
            form.removeError(k);
          }
        }

        //
        // 2. Collect item-level and child-level errors from this run
        //
        const matching = Object.entries(errors).filter(
          ([errKey]) => errKey === fieldKey || errKey.startsWith(fieldKey + ".")
        );

        const directErrors = matching
          .filter(([errKey]) => errKey === fieldKey)
          .flatMap(([_, msgs]) => msgs);

        const childErrors = matching
          .filter(([errKey]) => errKey.startsWith(fieldKey + "."))
          .reduce(
            (acc, [errKey, msgs]) => {
              acc.childMap[errKey] = msgs;
              acc.allChildMsgs.push(...msgs);
              return acc;
            },
            {
              childMap: {} as Record<string, string[]>,
              allChildMsgs: [] as string[],
            }
          );

        const hasAnyError =
          directErrors.length > 0 || childErrors.allChildMsgs.length > 0;

        //
        // 3. Apply fresh errors
        //
        if (hasAnyError) {
          valid = false;

          // parent-level
          if (directErrors.length > 0) {
            form.setError(fieldKey, directErrors);
          } else if (childErrors.allChildMsgs.length > 0) {
            form.setError(fieldKey, ["One or more items are invalid"]);
          }

          // child-level
          for (const [childKey, msgs] of Object.entries(childErrors.childMap)) {
            form.setError(childKey, msgs);
          }
        }
      }

      form.setIsValidating(false);

      return valid;
    },
  };
}
