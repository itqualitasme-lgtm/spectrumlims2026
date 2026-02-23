import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import Sidebar from "@/components/layout/sidebar"
import Header from "@/components/layout/header"

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const user = session.user as any
  const name: string = user.name ?? ""
  const username: string = user.username ?? ""
  const roleName: string = user.roleName ?? ""
  const labId: string = user.labId ?? ""
  const labName: string = user.labName ?? ""
  const permissions: string[] = user.permissions ?? []

  // Portal users should be redirected to the portal dashboard
  if (roleName === "Portal User") {
    redirect("/portal/dashboard")
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar permissions={permissions} roleName={roleName} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={{ name, username, roleName, labName }} />
        <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  )
}
