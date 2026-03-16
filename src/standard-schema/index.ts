import type { FormControlContext } from "svelte-simple-form";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { getDotPath } from "@standard-schema/utils";

interface Options {
  dependencies?: Partial<Record<string, string[]>>;
}

export function standardSchemaValidator<TInput, TOutput>(
  schema: StandardSchemaV1<TInput, TOutput>,
  options: Options = {},
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
      const callId = Symbol();
      latestFormCall = callId;

      const result = await validate(form.data);
      if (latestFormCall !== callId) return false;

      form.setErrors({});

      if (!result.issues) return true;

      const errors = convertIssues(result.issues as any);

      for (const [errKey, msgs] of Object.entries(errors)) {
        form.setError(errKey as any, msgs);

        if (errKey.includes(".")) {
          const parts = errKey.split(".");
          while (parts.length > 1) {
            parts.pop();
            const parentPath = parts.join(".");
            if (!errors[parentPath]) {
              form.setError(parentPath as any, [
                "One or more items are invalid",
              ]);
            }
          }
        }
      }

      return false;
    },

    async validateField(
      field: string,
      f: unknown,
      force = false,
      config?: {
        validateOn?: string[];
        validateAfter?: string;
        validateDebounce?: number;
      },
    ) {
      const form = f as FormControlContext;
      const callId = Symbol();
      latestCall[field] = callId;

      const result = await validate(form.data);

      if (latestCall[field] !== callId) return false;

      const errors = convertIssues((result.issues || []) as any[]);
      const fieldsToSync = getFieldsToCheck(field);
      let valid = true;

      const { validateOn, validateAfter, validateDebounce } = {
        validateOn: ["change", "blur", "submit"],
        validateAfter: "touched-and-dirty",
        validateDebounce: 100,
        ...config,
      };

      for (const fieldKey of fieldsToSync) {
        for (const k of Object.keys(form.errors)) {
          if (k === fieldKey || k.startsWith(fieldKey + ".")) {
            form.removeError(k);
          }
        }

        if (fieldKey.includes(".")) {
          const parts = fieldKey.split(".");
          while (parts.length > 1) {
            parts.pop();
            const p = parts.join(".");
            if (form.errors[p]?.[0] === "One or more items are invalid") {
              form.removeError(p);
            }
          }
        }

        const matching = Object.entries(errors).filter(
          ([errKey]) =>
            errKey === fieldKey || errKey.startsWith(fieldKey + "."),
        );

        if (matching.length > 0) {
          const isMainField = fieldKey === field;
          const isTouched = form.touched[fieldKey as any];
          const isDirty = form.dirty[fieldKey as any];

          const shouldShowError =
            (isMainField && force) ||
            (validateAfter === "touched"
              ? isTouched
              : validateAfter === "dirty"
                ? isDirty
                : validateAfter === "touched-or-dirty"
                  ? isTouched || isDirty
                  : isTouched && isDirty) ||
            form.isSubmitting;

          if (shouldShowError) {
            valid = false;

            for (const [errKey, msgs] of matching) {
              form.setError(errKey, msgs);

              if (errKey.includes(".")) {
                const parts = errKey.split(".");
                while (parts.length > 1) {
                  parts.pop();
                  const parentPath = parts.join(".");
                  if (!errors[parentPath] && !form.errors[parentPath]) {
                    form.setError(parentPath as any, [
                      "One or more items are invalid",
                    ]);
                  }
                }
              }
            }
          } else {
            valid = false;
          }
        }
      }

      return valid;
    },
  };
}
