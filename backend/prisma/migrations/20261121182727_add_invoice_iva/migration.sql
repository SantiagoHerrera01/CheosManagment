-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "electronic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ivaAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;
