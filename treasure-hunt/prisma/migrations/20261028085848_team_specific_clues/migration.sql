/*
  Warnings:

  - You are about to drop the column `result_number` on the `clues` table. All the data in the column will be lost.
  - Added the required column `result_code` to the `clues` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `clues` DROP COLUMN `result_number`,
    ADD COLUMN `result_code` VARCHAR(4) NOT NULL,
    ADD COLUMN `team_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `clues` ADD CONSTRAINT `clues_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
