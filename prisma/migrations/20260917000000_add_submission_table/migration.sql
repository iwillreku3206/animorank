-- CreateTable
CREATE TABLE "Submission" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "problem_id" UUID NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "tests_passed" INTEGER NOT NULL,
    "tests_total" INTEGER NOT NULL,
    "code" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Submission_student_id_problem_id_created_at_idx" ON "Submission"("student_id", "problem_id", "created_at");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
