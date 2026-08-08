-- CreateEnum
CREATE TYPE "ContactChangeKind" AS ENUM ('EMAIL', 'PHONE');

-- CreateTable
CREATE TABLE "ContactChangeChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ContactChangeKind" NOT NULL,
    "valueHash" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactChangeChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactChangeChallenge_userId_kind_expiresAt_idx"
ON "ContactChangeChallenge"("userId", "kind", "expiresAt");

-- CreateIndex
CREATE INDEX "ContactChangeChallenge_valueHash_kind_expiresAt_idx"
ON "ContactChangeChallenge"("valueHash", "kind", "expiresAt");

-- AddForeignKey
ALTER TABLE "ContactChangeChallenge"
ADD CONSTRAINT "ContactChangeChallenge_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
