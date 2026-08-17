-- CreateTable
CREATE TABLE "ProblemSetExtension" (
    "problem_set_id" UUID NOT NULL,
    "extension_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "ProblemSetExtension_pkey" PRIMARY KEY ("problem_set_id","extension_id")
);

-- AddForeignKey
ALTER TABLE "ProblemSetExtension" ADD CONSTRAINT "ProblemSetExtension_problem_set_id_fkey" FOREIGN KEY ("problem_set_id") REFERENCES "ProblemSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
