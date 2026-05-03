-- CreateEnum
CREATE TYPE "BaseType" AS ENUM ('INT', 'CHAR', 'BOOL', 'FLOAT', 'DOUBLE');

-- CreateEnum
CREATE TYPE "SizeModifier" AS ENUM ('LONG', 'LONG_LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "HistoryEntryType" AS ENUM ('TEXT_MODIFIED', 'PAGE_OPENED', 'PAGE_FOCUS', 'RUN_ATTEMPT', 'PING', 'OTHER');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('C');

-- CreateEnum
CREATE TYPE "ProblemTestCaseType" AS ENUM ('FunctionOutputTestCase', 'ProgramIOTestCase', 'CustomTestCase');

-- CreateEnum
CREATE TYPE "FunctionOutputTestCaseOperator" AS ENUM ('EQUAL', 'NOT_EQUAL', 'LESS_THAN', 'LESS_THAN_EQUAL', 'GREATER_THAN', 'GREATER_THAN_EQUAL', 'WITHIN_RANGE');

-- CreateEnum
CREATE TYPE "TagType" AS ENUM ('subject', 'difficulty', 'topic');

-- CreateEnum
CREATE TYPE "TagColor" AS ENUM ('default', 'primary', 'secondary', 'accent', 'red', 'yellow', 'green', 'blue');

-- CreateTable
CREATE TABLE "PracticeSession" (
    "id" UUID NOT NULL,
    "problem_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "previous_code" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PracticeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeHistoryEntry" (
    "id" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "HistoryEntryType" NOT NULL,
    "data" JSONB NOT NULL,
    "practice_session_id" UUID NOT NULL,

    CONSTRAINT "PracticeHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemTopic" (
    "problem_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "ProblemTopic_pkey" PRIMARY KEY ("problem_id","tag_id")
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "language" "Language" NOT NULL DEFAULT 'C',
    "starter_code" TEXT NOT NULL DEFAULT '',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "difficulty_id" UUID,
    "subject_id" UUID,
    "problem_set_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemTestCase" (
    "id" UUID NOT NULL,
    "type" "ProblemTestCaseType" NOT NULL DEFAULT 'FunctionOutputTestCase',
    "public" BOOLEAN NOT NULL DEFAULT true,
    "problem_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ProblemTestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunctionOutputTestCase" (
    "id" UUID NOT NULL,
    "parameters" JSONB NOT NULL DEFAULT '[]',
    "comparisons" JSONB NOT NULL DEFAULT '[]',
    "return_type" JSONB NOT NULL DEFAULT '{"type":"int", "data":{"signed":"none","value": "5","size": 32}}',
    "function_name" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "FunctionOutputTestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramIOTestCase" (
    "id" UUID NOT NULL,
    "input" TEXT NOT NULL DEFAULT '',
    "output" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ProgramIOTestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomTestCase" (
    "id" UUID NOT NULL,
    "test_code" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CustomTestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemSetTopic" (
    "problem_set_id" UUID NOT NULL,
    "topic_tag_id" UUID NOT NULL,

    CONSTRAINT "ProblemSetTopic_pkey" PRIMARY KEY ("problem_set_id","topic_tag_id")
);

-- CreateTable
CREATE TABLE "ProblemSet" (
    "id" UUID NOT NULL,
    "description" TEXT,
    "title" TEXT NOT NULL,
    "auto_accept" BOOLEAN NOT NULL DEFAULT false,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "difficulty_id" UUID,
    "subject_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ProblemSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemSetBookmark" (
    "user_id" UUID NOT NULL,
    "problem_set_id" UUID NOT NULL,

    CONSTRAINT "ProblemSetBookmark_pkey" PRIMARY KEY ("problem_set_id","user_id")
);

-- CreateTable
CREATE TABLE "ProblemSetCollaborator" (
    "collaborator_id" UUID NOT NULL,
    "problem_set_id" UUID NOT NULL,

    CONSTRAINT "ProblemSetCollaborator_pkey" PRIMARY KEY ("collaborator_id","problem_set_id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "problem_set_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "status" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("problem_set_id","student_id")
);

-- CreateTable
CREATE TABLE "SubjectTag" (
    "id" UUID NOT NULL,
    "type" "TagType" NOT NULL,
    "color" "TagColor" NOT NULL DEFAULT 'default',
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SubjectTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DifficultyTag" (
    "id" UUID NOT NULL,
    "type" "TagType" NOT NULL,
    "color" "TagColor" NOT NULL DEFAULT 'default',
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DifficultyTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicTag" (
    "id" UUID NOT NULL,
    "type" "TagType" NOT NULL,
    "color" "TagColor" NOT NULL DEFAULT 'default',
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TopicTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" UUID NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" UUID NOT NULL,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherList" (
    "email" TEXT NOT NULL,

    CONSTRAINT "TeacherList_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hasAcceptedTOS" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "Authenticator" (
    "credentialID" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "credentialPublicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "credentialDeviceType" TEXT NOT NULL,
    "credentialBackedUp" BOOLEAN NOT NULL,
    "transports" TEXT,

    CONSTRAINT "Authenticator_pkey" PRIMARY KEY ("userId","credentialID")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubjectTag_label_key" ON "SubjectTag"("label");

-- CreateIndex
CREATE UNIQUE INDEX "DifficultyTag_label_key" ON "DifficultyTag"("label");

-- CreateIndex
CREATE UNIQUE INDEX "TopicTag_label_key" ON "TopicTag"("label");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Authenticator_credentialID_key" ON "Authenticator"("credentialID");

-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeHistoryEntry" ADD CONSTRAINT "PracticeHistoryEntry_practice_session_id_fkey" FOREIGN KEY ("practice_session_id") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTopic" ADD CONSTRAINT "ProblemTopic_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTopic" ADD CONSTRAINT "ProblemTopic_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "TopicTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_difficulty_id_fkey" FOREIGN KEY ("difficulty_id") REFERENCES "DifficultyTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "SubjectTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_problem_set_id_fkey" FOREIGN KEY ("problem_set_id") REFERENCES "ProblemSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTestCase" ADD CONSTRAINT "ProblemTestCase_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionOutputTestCase" ADD CONSTRAINT "FunctionOutputTestCase_id_fkey" FOREIGN KEY ("id") REFERENCES "ProblemTestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramIOTestCase" ADD CONSTRAINT "ProgramIOTestCase_id_fkey" FOREIGN KEY ("id") REFERENCES "ProblemTestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomTestCase" ADD CONSTRAINT "CustomTestCase_id_fkey" FOREIGN KEY ("id") REFERENCES "ProblemTestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemSetTopic" ADD CONSTRAINT "ProblemSetTopic_problem_set_id_fkey" FOREIGN KEY ("problem_set_id") REFERENCES "ProblemSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemSetTopic" ADD CONSTRAINT "ProblemSetTopic_topic_tag_id_fkey" FOREIGN KEY ("topic_tag_id") REFERENCES "TopicTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemSet" ADD CONSTRAINT "ProblemSet_difficulty_id_fkey" FOREIGN KEY ("difficulty_id") REFERENCES "DifficultyTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemSet" ADD CONSTRAINT "ProblemSet_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "SubjectTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemSetBookmark" ADD CONSTRAINT "ProblemSetBookmark_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemSetBookmark" ADD CONSTRAINT "ProblemSetBookmark_problem_set_id_fkey" FOREIGN KEY ("problem_set_id") REFERENCES "ProblemSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemSetCollaborator" ADD CONSTRAINT "ProblemSetCollaborator_collaborator_id_fkey" FOREIGN KEY ("collaborator_id") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemSetCollaborator" ADD CONSTRAINT "ProblemSetCollaborator_problem_set_id_fkey" FOREIGN KEY ("problem_set_id") REFERENCES "ProblemSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_problem_set_id_fkey" FOREIGN KEY ("problem_set_id") REFERENCES "ProblemSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_id_fkey" FOREIGN KEY ("id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_id_fkey" FOREIGN KEY ("id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Authenticator" ADD CONSTRAINT "Authenticator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
