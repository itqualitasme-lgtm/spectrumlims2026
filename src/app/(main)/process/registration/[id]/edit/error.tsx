"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function EditSampleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("EditSample error:", error)
  }, [error])

  return (
    <div className="container mx-auto py-10 max-w-3xl">
      <Card>
        <CardContent className="py-10 text-center space-y-4">
          <p className="text-destructive font-medium">Something went wrong loading this page.</p>
          <p className="text-sm text-muted-foreground">{error.message || "Please try again."}</p>
          <div className="flex justify-center gap-2">
            <Button onClick={reset}>Try Again</Button>
            <Button variant="outline" onClick={() => window.history.back()}>Go Back</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
