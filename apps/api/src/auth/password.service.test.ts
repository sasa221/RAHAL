import { PasswordService } from "./password.service";

describe("PasswordService", () => {
  const passwords = new PasswordService();

  it("hashes passwords with scrypt and a random salt", async () => {
    const first = await passwords.hash("a-strong-customer-password");
    const second = await passwords.hash("a-strong-customer-password");

    expect(first).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(second).not.toBe(first);
    await expect(passwords.verify("a-strong-customer-password", first)).resolves.toBe(true);
  });

  it("rejects wrong passwords and unknown hash formats", async () => {
    const encoded = await passwords.hash("correct-password-value");
    await expect(passwords.verify("wrong-password-value", encoded)).resolves.toBe(false);
    await expect(passwords.verify("correct-password-value", "bcrypt$unsupported")).resolves.toBe(
      false,
    );
  });
});
