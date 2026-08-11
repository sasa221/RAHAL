import { describe, expect, it, vi } from "vitest";
import { NotificationsRepository } from "./notifications.repository";

function setup() {
  const findMany = vi.fn().mockResolvedValue([]);
  const repository = new NotificationsRepository({
    client: { user: { findMany } },
  } as never);
  return { findMany, repository };
}

describe("NotificationsRepository campaign recipients", () => {
  it("includes customers awaiting verification in operational campaigns", async () => {
    const { findMany, repository } = setup();

    await repository.campaignRecipients({
      audience: "CUSTOMERS",
      marketing: false,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          systemRole: { in: ["CUSTOMER"] },
          status: { in: ["ACTIVE", "PENDING_VERIFICATION"] },
        }),
      }),
    );
  });

  it("includes explicitly opted-in customers while verification is pending", async () => {
    const { findMany, repository } = setup();

    await repository.campaignRecipients({
      audience: "CUSTOMERS",
      marketing: true,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ["ACTIVE", "PENDING_VERIFICATION"] },
          notificationPreference: { is: { marketingEnabled: true } },
        }),
      }),
    );
  });

  it("does not include pending staff in mixed operational audiences", async () => {
    const { findMany, repository } = setup();

    await repository.campaignRecipients({
      audience: "CUSTOMERS_AND_SALES",
      marketing: false,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            {
              systemRole: "CUSTOMER",
              status: { in: ["ACTIVE", "PENDING_VERIFICATION"] },
            },
            { systemRole: "SALES", status: "ACTIVE" },
          ],
        }),
      }),
    );
  });

  it("searches only active recipient roles and returns privacy-bounded fields", async () => {
    const { findMany, repository } = setup();

    await repository.campaignRecipientOptions({ query: "saleh", roles: ["CUSTOMER"] });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          systemRole: { in: ["CUSTOMER"] },
          AND: expect.any(Array),
        }),
        take: 12,
        select: expect.objectContaining({
          id: true,
          email: true,
          phone: true,
          notificationPreference: { select: { marketingEnabled: true } },
        }),
      }),
    );
  });

  it("requires marketing opt-in when resolving one campaign recipient", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "customer-1" });
    const repository = new NotificationsRepository({
      client: { user: { findFirst } },
    } as never);

    await repository.campaignRecipientById({
      id: "customer-1",
      roles: ["CUSTOMER"],
      marketing: true,
    });

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "customer-1",
          systemRole: { in: ["CUSTOMER"] },
          notificationPreference: { is: { marketingEnabled: true } },
        }),
      }),
    );
  });
});
