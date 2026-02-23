import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { PortalHeader } from "./portal-header"

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/portal/login")
  }

  const user = session.user as any

  if (user.roleName !== "Portal User") {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader user={user} />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
