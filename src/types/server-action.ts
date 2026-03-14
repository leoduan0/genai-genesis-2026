export type ServerActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }
