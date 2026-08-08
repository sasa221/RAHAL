export type E2eRole = "customer" | "sales" | "rival-sales" | "admin";

export function fixtureKey(projectName: string) {
  return projectName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

export function fixtureIds(projectName: string) {
  const key = fixtureKey(projectName);
  return {
    reservationId: `e2e-reservation-${key}`,
    reference: `RAHAL-E2E-${key.toUpperCase()}`,
    users: {
      customer: `e2e-customer-${key}`,
      sales: `e2e-sales-${key}`,
      "rival-sales": `e2e-rival-sales-${key}`,
      admin: `e2e-admin-${key}`,
    } satisfies Record<E2eRole, string>,
  };
}

export function sessionToken(projectName: string, role: E2eRole) {
  return `rahal-e2e-${fixtureKey(projectName)}-${role}-session-token`;
}

export function storageStatePath(projectName: string, role: E2eRole) {
  return `test-results/.auth/${fixtureKey(projectName)}-${role}.json`;
}
