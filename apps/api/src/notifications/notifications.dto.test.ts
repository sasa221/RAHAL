import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { CreateNotificationCampaignDto } from "./notifications.dto";

const campaign = {
  category: "GENERAL_UPDATE",
  audience: "CUSTOMERS",
  titleAr: "تحديث رحال",
  titleEn: "Rahal update",
  bodyAr: "يوجد تحديث جديد بخصوص رحلتك داخل رحال.",
  bodyEn: "There is a new update about your journey with Rahal.",
  channels: ["IN_APP"],
  important: false,
  marketing: false,
};

describe("CreateNotificationCampaignDto recipient validation", () => {
  it("accepts Prisma CUID recipient identifiers", async () => {
    const errors = await validate(
      plainToInstance(CreateNotificationCampaignDto, {
        ...campaign,
        recipientId: "cm2n9e6q50000a9m5vw6fa9p0",
      }),
    );

    expect(errors).toEqual([]);
  });

  it("rejects a malformed short recipient identifier", async () => {
    const errors = await validate(
      plainToInstance(CreateNotificationCampaignDto, { ...campaign, recipientId: "wrong" }),
    );

    expect(errors.some((error) => error.property === "recipientId")).toBe(true);
  });
});
