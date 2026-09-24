import { SvelteKitAuth, type DefaultSession } from '@auth/sveltekit';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Google from '@auth/sveltekit/providers/google';
import { db } from './zenstack';

declare module '@auth/sveltekit' {
  interface Session {
    user: {
      userId: string;
      type?: 'student' | 'teacher';
      hasAcceptedTOS: boolean;
      /**
       * By default, TypeScript merges new interface properties and overwrites existing ones.
       * In this case, the default session user properties will be overwritten,
       * with the new ones defined above. To keep the default session user properties,
       * you need to add them back into the newly declared interface.
       */
    } & DefaultSession['user'];
  }
}

export const { handle } = SvelteKitAuth({
  providers: [
    Google({
      authorization: {
        params: {
          prompt: 'consent'
        }
      }
    })
  ],
  adapter: PrismaAdapter(db),
  callbacks: {
    async session({ session, user }) {
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        include: { student: true, teacher: true }
      });

      if (!dbUser) return session;

      if (dbUser.teacher) {
        session.user.type = 'teacher';
      } else {
        session.user.type = 'student';
      }

      session.user.hasAcceptedTOS = dbUser.hasAcceptedTOS;

      return session;
    },
    /**
     * Sign-in is restricted on purpose: only an address on the course's own
     * domain (`@dlsu.edu.ph`), or one an operator has allow-listed in
     * `TeacherList`, is admitted. An address outside those is refused rather
     * than created as an account.
     *
     * Matching is exact — the suffix is compared as the provider reports it,
     * and `TeacherList` is keyed on the address as stored — so an address
     * differing only in case does not match. That is intended, not an
     * oversight: do not add case folding here without deciding the policy
     * again.
     */
    async signIn({ user }) {
      if (!user.email || !user.id) return false;
      const teacher = await db.teacherList.findUnique({ where: { email: user.email } });

      if (!teacher && !user.email.endsWith('@dlsu.edu.ph')) return false;

      return true;
    }
  },
  events: {
    async signIn({ user }) {
      if (!user.email || !user.id) return;
      const teacher = await db.teacherList.findUnique({ where: { email: user.email } });
      const obj = { id: user.id };
      if (teacher) {
        await db.teacher.upsert({ create: obj, update: {}, where: obj });
      } else {
        await db.student.upsert({ create: obj, update: {}, where: obj });
      }
    }
  },
  trustHost: true
});
