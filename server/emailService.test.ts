import { describe, expect, it } from "vitest";
import { testEmailConnection } from "./_core/emailService";

describe("emailService", () => {
  it("should verify email connection", async () => {
    const result = await testEmailConnection();
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("message");
  });
});
