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
    }
  },
  events: {
    async signIn({ user }) {
      if (!user.email || !user.id) return;
      const dbUser = await db.teacherList.findUnique({ where: { email: user.email } });

      const obj = { id: user.id };
      if (dbUser) {
        await db.teacher.upsert({ create: obj, update: {}, where: obj });
      } else {
        await db.student.upsert({ create: obj, update: {}, where: obj });
      }
    }
  },
  trustHost: true
});
