/**
 * Build the greeting string returned by the Rust `greet` command.
 * Kept in TS as a pure mirror so the UI can preview without a round-trip,
 * and so we have something trivial to test in v1 scaffolding.
 */
export function formatGreeting(name: string): string {
  const trimmed = name.trim();
  const target = trimmed.length > 0 ? trimmed : "world";
  return `Hello, ${target}! You've been greeted from Rust!`;
}
