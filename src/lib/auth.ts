import { SvelteKitAuth, type DefaultSession } from "@auth/sveltekit"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Google from '@auth/sveltekit/providers/google'
import { prisma } from "./prisma"

declare module "@auth/sveltekit" {
  interface Session {
    user: {
      userId: string
      type?: 'student' | 'teacher'
      /**
       * By default, TypeScript merges new interface properties and overwrites existing ones.
       * In this case, the default session user properties will be overwritten,
       * with the new ones defined above. To keep the default session user properties,
       * you need to add them back into the newly declared interface.
       */
    } & DefaultSession["user"]
  }
}


export const { handle } = SvelteKitAuth({
  providers: [Google({
    authorization: {
      params: {
        prompt: 'consent'
      }
    }
  })],
  adapter: PrismaAdapter(prisma),
  callbacks: {
    async session({ session, user }) {
      const dbUser = await prisma.user.findUnique({ where: { id: user.id }, include: { student: true, teacher: true } })

      if (!dbUser) return session

      if (dbUser.teacher) {
        session.user.type = 'teacher'
      } else {
        session.user.type = 'student'
      }

      return session
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.email || !user.id) return
      const dbUser = await prisma.teacherList.findUnique({ where: { email: user.email } })

      const obj = { id: user.id }
      if (dbUser) {
        console.log('created teacher: ', user.email)
        await prisma.teacher.upsert({ create: obj, update: {}, where: obj })
      } else {
        await prisma.student.upsert({ create: obj, update: {}, where: obj })
      }
    },
  }
})
