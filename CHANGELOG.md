# Changelog

All notable changes to this project will be documented in this file.

---

## [0.0.6] - 2026-03-17

### 🐛 Bug Fixes

- **Recursive Error Bubbling**: Fixed an issue where parent paths (especially in arrays) failed to receive the "One or more items are invalid" label during field-level validation (`validateField`).
- **Stale Parent Error Cleanup**: Improved cleanup logic to ensure that generic bubbling errors on parent paths are correctly removed when nested children become valid. It now iteratively cleans all parent levels (e.g., `a.b.c` -> `a.b` -> `a`).
- **Conflict Prevention**: Enhanced bubbling logic to ensure generic "invalid" labels never overwrite specific error messages defined in the schema for parent paths.
- **Deep Path Synchronization**: Refactored `validateField` to correctly handle the lifecycle of deeply nested paths, ensuring `touched` and `dirty` states are respected while maintaining accurate error mapping.

### ♻️ Internal Changes

- **Iterative Path Traversing**: Implemented a `while` loop strategy for both cleaning and applying parent errors, ensuring reliability for deeply nested structures.
- **Improved Field Matching**: Optimized how schema issues are filtered and matched against `fieldsToSync` to provide more predictable validation results.

---

## [0.0.5] - 2026-03-17

### 🚀 Features

- **Error Bubbling**: Automatically propagates errors to parent paths. If a nested field (e.g., `profile.bio`) is invalid, the parent path (`profile`) will receive a "One or more items are invalid" message, making it easier to highlight invalid sections in the UI.
- **Strategy Awareness**: The validator now respects the form's `validateAfter` rules (`touched`, `dirty`, etc.). Errors will only be committed to the form state if the field meets the visibility criteria.
- **Enhanced Field Dependencies**: Improved the `options.dependencies` logic to ensure that when a field is validated, all related fields are re-synced correctly with the latest schema results.

### 🐛 Bug Fixes

- **Async Race Condition Guard**: Implemented `Symbol()`-based `callId` tracking for both form-level and field-level validations to discard outdated results from rapid typing.
- **Deep Error Cleanup**: Refactored the cleanup process to ensure that when a field is re-validated, all previous errors for that path and its sub-paths (children) are cleared first.

### ⚠️ Breaking Changes

- **Core Library Requirement**: This version requires `svelte-simple-form` **v0.4.8** or higher due to the new `validateField` signature.
- **Updated Signature**: `validateField` now accepts the new `force` and `config` parameters:

```ts
validateField(field, form, force?, config?): Promise<boolean>;

```

### ♻️ Internal Changes

- **Config Inheritance**: The validator now uses the form's `config` (validateOn, validateAfter, etc.) as the source of truth, with sensible internal fallbacks.
- **Bubbling Logic**: Added specific logic to check for `.` in error keys to identify parent paths for automatic error flagging.
