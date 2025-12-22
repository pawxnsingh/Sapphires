/*
  Warnings:

  - Added the required column `type` to the `Prompt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Prompt" ADD COLUMN     "type" "PromptType" NOT NULL;
