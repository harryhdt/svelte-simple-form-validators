# Svelte Simple Form Validators

A validation utilities designed specifically for [Svelte Simple Form](https://github.com/harryhdt/svelte-simple-form)

### Install

```bash
npm install @svelte-simple-form/validators
```

> Ensure you already installed `svelte-simple-form`

## Standard Schema

Compatible with any validation library that implements the Standard Schema spec `(@standard-schema/spec)`.
<br>
For example: Zod, Valibot, and etc.
<br>
Docs [Standard Schema](https://standardschema.dev/)

##### Usage

```ts
import z from "zod";
import { useForm } from "svelte-simple-form";
import { standardSchemaValidator } from "@svelte-simple-form/validators/standard-schema";

const schema = z.object({
  name: z.string().min(3),
  email: z.email(),
  age: z.number().min(10),
});

const { form } = useForm({
  initialValues: {
    name: "",
    email: "",
    age: "",
  },
  validator: standardSchemaValidator(schema),
  onSubmit: async (values) => {
    console.log(values);
  },
});
```

## Contribute

Contributions are highly appreciated!
<br>
You can help by improving validation performance, adding more schema adapters, fixing bugs, and etc.
