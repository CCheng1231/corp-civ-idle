import { describe, expect, it } from "vitest";
import {
  accessKeyEmailLockMessage,
  accessKeyEmailLockSatisfied,
} from "./accessKeyEmailLock";
import { normalizeEmail } from "./firebaseAuth";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Alice@Gmail.COM ")).toBe("alice@gmail.com");
  });
});

describe("accessKeyEmailLockSatisfied", () => {
  const userWith = (email: string) =>
    ({ email, isAnonymous: false, providerData: [] }) as unknown as import("firebase/auth").User;

  it("allows any Google account when lock omitted", () => {
    expect(accessKeyEmailLockSatisfied({}, userWith("a@b.com"))).toBe(true);
  });

  it("requires matching email when locked", () => {
    expect(
      accessKeyEmailLockSatisfied(
        { lockedEmail: "play@test.com" },
        userWith("play@test.com"),
      ),
    ).toBe(true);
    expect(
      accessKeyEmailLockSatisfied(
        { lockedEmail: "play@test.com" },
        userWith("other@test.com"),
      ),
    ).toBe(false);
  });

  it("rejects missing user email when locked", () => {
    expect(
      accessKeyEmailLockSatisfied({ lockedEmail: "play@test.com" }, userWith("")),
    ).toBe(false);
  });
});

describe("accessKeyEmailLockMessage", () => {
  it("names the invite email", () => {
    expect(accessKeyEmailLockMessage("alice@gmail.com")).toContain(
      "alice@gmail.com",
    );
  });
});