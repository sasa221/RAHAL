import { describe, expect, it } from "vitest";
import { apiErrorMessage } from "./api-error";

describe("apiErrorMessage", () => {
  it("reads the nested error envelope returned by the API", () => {
    expect(
      apiErrorMessage(
        { error: { message: "No active recipients match this audience." } },
        "Unavailable",
      ),
    ).toBe("No active recipients match this audience.");
  });

  it("supports validation arrays and falls back for malformed responses", () => {
    expect(apiErrorMessage({ message: ["Choose a channel.", "Add a title."] }, "Unavailable")).toBe(
      "Choose a channel.",
    );
    expect(apiErrorMessage({ error: null }, "Unavailable")).toBe("Unavailable");
  });
});
