-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'super_admin';

-- AlterTable
ALTER TABLE "tcategorieplat" ADD COLUMN     "parent_id" INTEGER;

-- AddForeignKey
ALTER TABLE "tcategorieplat" ADD CONSTRAINT "tcategorieplat_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "tcategorieplat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
