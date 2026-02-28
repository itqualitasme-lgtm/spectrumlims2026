import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { db } from "./db"

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        const username = credentials.username as string
        const password = credentials.password as string

        // 1. Try regular User table first
        const user = await db.user.findUnique({
          where: { username },
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
            lab: true,
          },
        })

        if (user && user.isActive) {
          const isPasswordValid = await compare(password, user.passwordHash)
          if (!isPasswordValid) return null

          await db.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          })

          const permissions = user.role.rolePermissions.map(
            (rp) => `${rp.permission.module}:${rp.permission.action}`
          )

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            roleId: user.roleId,
            roleName: user.role.name,
            labId: user.labId,
            labName: user.lab.name,
            labCode: user.lab.code,
            customerId: null,
            permissions,
            hiddenMenuItems: (user.menuAccess as string[]) || [],
          } as any
        }

        // 2. Fallback: try PortalUser table
        const portalUser = await db.portalUser.findUnique({
          where: { username },
          include: {
            customer: {
              include: { lab: true },
            },
          },
        })

        if (!portalUser || !portalUser.isActive) return null

        const isPortalPwValid = await compare(password, portalUser.password)
        if (!isPortalPwValid) return null

        await db.portalUser.update({
          where: { id: portalUser.id },
          data: { lastLogin: new Date() },
        })

        return {
          id: `portal_${portalUser.id}`,
          name: portalUser.customer.name,
          email: portalUser.customer.email,
          username: portalUser.username,
          roleId: "portal",
          roleName: "Portal User",
          labId: portalUser.customer.labId,
          labName: portalUser.customer.lab.name,
          labCode: portalUser.customer.lab.code,
          customerId: portalUser.customerId,
          permissions: ["portal:view"],
        } as any
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
        token.username = (user as any).username
        token.roleId = (user as any).roleId
        token.roleName = (user as any).roleName
        token.labId = (user as any).labId
        token.labName = (user as any).labName
        token.labCode = (user as any).labCode
        token.customerId = (user as any).customerId
        token.permissions = (user as any).permissions
        token.hiddenMenuItems = (user as any).hiddenMenuItems
        token.issuedAt = Date.now()
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as any).username = token.username
        ;(session.user as any).roleId = token.roleId
        ;(session.user as any).roleName = token.roleName
        ;(session.user as any).labId = token.labId
        ;(session.user as any).labName = token.labName
        ;(session.user as any).labCode = token.labCode
        ;(session.user as any).customerId = token.customerId
        ;(session.user as any).hiddenMenuItems = token.hiddenMenuItems || []

        // Refresh permissions from DB
        const tokenId = token.id as string
        const isPortalUser = tokenId.startsWith("portal_")

        if (isPortalUser) {
          try {
            const portalId = tokenId.replace("portal_", "")
            const portalUser = await db.portalUser.findUnique({ where: { id: portalId } })
            ;(session.user as any).permissions = portalUser?.isActive ? ["portal:view"] : []
          } catch {
            ;(session.user as any).permissions = token.permissions
          }
        } else {
          try {
            const freshUser = await db.user.findUnique({
              where: { id: tokenId },
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: { permission: true },
                    },
                  },
                },
              },
            })
            if (freshUser && freshUser.isActive) {
              // Force re-login if password was changed after this session was created
              if (freshUser.passwordChangedAt && token.issuedAt) {
                if (freshUser.passwordChangedAt.getTime() > (token.issuedAt as number)) {
                  ;(session.user as any).permissions = []
                  ;(session.user as any).hiddenMenuItems = []
                  return session
                }
              }
              const freshPermissions = freshUser.role.rolePermissions.map(
                (rp) => `${rp.permission.module}:${rp.permission.action}`
              )
              ;(session.user as any).permissions = freshPermissions
              ;(session.user as any).roleName = freshUser.role.name
              ;(session.user as any).hiddenMenuItems = (freshUser.menuAccess as string[]) || []
            } else {
              ;(session.user as any).permissions = []
              ;(session.user as any).hiddenMenuItems = []
            }
          } catch {
            ;(session.user as any).permissions = token.permissions
            ;(session.user as any).hiddenMenuItems = token.hiddenMenuItems || []
          }
        }
      }
      return session
    },
  },
})
