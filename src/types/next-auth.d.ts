import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username: string
      roleId: string
      roleName: string
      labId: string
      labName: string
      labCode: string
      customerId: string | null
      permissions: string[]
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    username: string
    roleId: string
    roleName: string
    labId: string
    labName: string
    labCode: string
    customerId: string | null
    permissions: string[]
  }
}
