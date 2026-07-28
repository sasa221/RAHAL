-- CreateEnum
CREATE TYPE "StaffMfaChallengeKind" AS ENUM ('ENROLL', 'VERIFY');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "temporaryPasswordIssuedAt" TIMESTAMP(3);

ALTER TABLE "Session"
ADD COLUMN "mfaVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StaffMfaCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secretCiphertext" TEXT NOT NULL,
    "enabledAt" TIMESTAMP(3) NOT NULL,
    "lastUsedCounter" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMfaCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMfaRecoveryCode" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffMfaRecoveryCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffLoginChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "kind" "StaffMfaChallengeKind" NOT NULL,
    "secretCiphertext" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffLoginChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffMfaCredential_userId_key" ON "StaffMfaCredential"("userId");

-- CreateIndex
CREATE INDEX "StaffMfaCredential_enabledAt_idx" ON "StaffMfaCredential"("enabledAt");

-- CreateIndex
CREATE UNIQUE INDEX "StaffMfaRecoveryCode_codeHash_key" ON "StaffMfaRecoveryCode"("codeHash");

-- CreateIndex
CREATE INDEX "StaffMfaRecoveryCode_credentialId_usedAt_idx" ON "StaffMfaRecoveryCode"("credentialId", "usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StaffLoginChallenge_tokenHash_key" ON "StaffLoginChallenge"("tokenHash");

-- CreateIndex
CREATE INDEX "StaffLoginChallenge_userId_expiresAt_idx" ON "StaffLoginChallenge"("userId", "expiresAt");

-- AddForeignKey
ALTER TABLE "StaffMfaCredential"
ADD CONSTRAINT "StaffMfaCredential_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMfaRecoveryCode"
ADD CONSTRAINT "StaffMfaRecoveryCode_credentialId_fkey"
FOREIGN KEY ("credentialId") REFERENCES "StaffMfaCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffLoginChallenge"
ADD CONSTRAINT "StaffLoginChallenge_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
