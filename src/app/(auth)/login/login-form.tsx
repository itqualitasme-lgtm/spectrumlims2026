"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Eye, EyeOff, Loader2, FlaskConical } from "lucide-react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const demoCredentials = [
  { username: "admin", password: "admin123", label: "Admin" },
  { username: "manager", password: "manager123", label: "Lab Manager" },
  { username: "accounts", password: "accounts123", label: "Accounts" },
  { username: "chemist", password: "chemist123", label: "Chemist" },
  { username: "registration", password: "reg123", label: "Registration" },
  { username: "sampler", password: "sampler123", label: "Sampler" },
  { username: "petroco", password: "client123", label: "Portal - PetroCo" },
  { username: "demo", password: "client123", label: "Portal - Demo Co" },
]

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl")

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid username or password")
        setLoading(false)
        return
      }

      // Fetch session to determine user type
      const sessionRes = await fetch("/api/auth/session")
      const session = await sessionRes.json()

      if (callbackUrl) {
        router.push(callbackUrl)
      } else if (session?.user?.id?.startsWith("portal_")) {
        router.push("/portal/dashboard")
      } else {
        router.push("/dashboard")
      }
    } catch {
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  function handleDemoClick(demoUsername: string, demoPassword: string) {
    setUsername(demoUsername)
    setPassword(demoPassword)
    setError("")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardHeader className="items-center text-center">
            <Image
              src="/images/logo-full.png"
              alt="Spectrum LIMS"
              width={200}
              height={60}
              className="mb-2"
              priority
            />
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">Spectrum LIMS</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Laboratory Information Management System
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <p className="text-center text-sm font-medium text-muted-foreground">
              Demo Credentials
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {demoCredentials.map((cred) => (
                <button
                  key={cred.username}
                  type="button"
                  onClick={() => handleDemoClick(cred.username, cred.password)}
                  className="rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <div className="font-medium">{cred.username}</div>
                  <div className="text-xs text-muted-foreground">{cred.label}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
