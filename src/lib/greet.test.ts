import { describe, it, expect } from "vitest";
import { formatGreeting } from "./greet";

describe("formatGreeting", () => {
  it("uses the given name when non-empty", () => {
    expect(formatGreeting("InfluxDB")).toBe(
      "Hello, InfluxDB! You've been greeted from Rust!"
    );
  });

  it("falls back to 'world' for empty input", () => {
    expect(formatGreeting("")).toBe(
      "Hello, world! You've been greeted from Rust!"
    );
  });

  it("trims surrounding whitespace before deciding", () => {
    expect(formatGreeting("   ")).toBe(
      "Hello, world! You've been greeted from Rust!"
    );
    expect(formatGreeting("  Alice  ")).toBe(
      "Hello, Alice! You've been greeted from Rust!"
    );
  });
});
