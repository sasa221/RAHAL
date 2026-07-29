CREATE TABLE "ContractAccessLog" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "ipHash" TEXT,
    "succeeded" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractAccessLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContractAccessLog_contractId_createdAt_idx"
ON "ContractAccessLog"("contractId", "createdAt");

CREATE INDEX "ContractAccessLog_actorId_createdAt_idx"
ON "ContractAccessLog"("actorId", "createdAt");

ALTER TABLE "ContractAccessLog"
ADD CONSTRAINT "ContractAccessLog_contractId_fkey"
FOREIGN KEY ("contractId") REFERENCES "Contract"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContractAccessLog"
ADD CONSTRAINT "ContractAccessLog_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
