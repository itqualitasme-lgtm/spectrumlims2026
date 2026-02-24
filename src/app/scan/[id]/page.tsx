import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export default async function ScanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const sample = await db.sample.findUnique({
    where: { id },
    include: {
      client: true,
      sampleType: true,
      lab: { select: { name: true } },
      assignedTo: { select: { name: true } },
      collectedBy: { select: { name: true } },
      registeredBy: { select: { name: true } },
      testResults: {
        select: {
          parameter: true,
          testMethod: true,
          unit: true,
          resultValue: true,
          status: true,
        },
      },
    },
  })

  if (!sample) return notFound()

  const statusColor: Record<string, string> = {
    pending: "bg-gray-100 text-gray-800",
    registered: "bg-blue-100 text-blue-800",
    assigned: "bg-indigo-100 text-indigo-800",
    testing: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    reported: "bg-emerald-100 text-emerald-800",
  }

  const testStatusColor: Record<string, string> = {
    pending: "text-gray-500",
    in_progress: "text-yellow-600",
    completed: "text-green-600",
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Lab header */}
        <div className="text-center">
          <h1 className="text-lg font-bold">{sample.lab.name}</h1>
          <p className="text-xs text-muted-foreground">Sample Tracking</p>
        </div>

        {/* Sample ID card */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold font-mono">{sample.sampleNumber}</h2>
              <Badge className={statusColor[sample.status] || "bg-gray-100 text-gray-800"}>
                {sample.status.charAt(0).toUpperCase() + sample.status.slice(1)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Customer</span>
                <p className="font-medium">{sample.client.company || sample.client.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Sample Type</span>
                <p className="font-medium">{sample.sampleType.name}</p>
              </div>
              {sample.samplePoint && (
                <div>
                  <span className="text-muted-foreground text-xs">Sample Point</span>
                  <p className="font-medium">{sample.samplePoint}</p>
                </div>
              )}
              {sample.description && (
                <div>
                  <span className="text-muted-foreground text-xs">Description</span>
                  <p className="font-medium">{sample.description}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground text-xs">Priority</span>
                <p className="font-medium capitalize">{sample.priority}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Job Type</span>
                <p className="font-medium capitalize">{sample.jobType}</p>
              </div>
              {sample.quantity && (
                <div>
                  <span className="text-muted-foreground text-xs">Bottle Size</span>
                  <p className="font-medium">{sample.quantity}</p>
                </div>
              )}
              {sample.reference && (
                <div>
                  <span className="text-muted-foreground text-xs">Reference / PO</span>
                  <p className="font-medium">{sample.reference}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground text-xs">Registered</span>
                <p className="font-medium">{format(sample.registeredAt || sample.createdAt, "dd MMM yyyy, HH:mm")}</p>
              </div>
              {sample.registeredBy && (
                <div>
                  <span className="text-muted-foreground text-xs">Registered By</span>
                  <p className="font-medium">{sample.registeredBy.name}</p>
                </div>
              )}
              {sample.collectedBy && (
                <div>
                  <span className="text-muted-foreground text-xs">Collected By</span>
                  <p className="font-medium">{sample.collectedBy.name}</p>
                </div>
              )}
              {sample.collectionLocation && (
                <div>
                  <span className="text-muted-foreground text-xs">Collection Location</span>
                  <p className="font-medium">{sample.collectionLocation}</p>
                </div>
              )}
              {sample.assignedTo && (
                <div>
                  <span className="text-muted-foreground text-xs">Assigned To</span>
                  <p className="font-medium">{sample.assignedTo.name}</p>
                </div>
              )}
              {sample.notes && (
                <div className="col-span-2">
                  <span className="text-muted-foreground text-xs">Notes</span>
                  <p className="font-medium">{sample.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test results */}
        {sample.testResults.length > 0 && (
          <Card>
            <CardContent className="py-3">
              <h3 className="text-sm font-semibold mb-2">Test Parameters ({sample.testResults.length})</h3>
              <div className="divide-y text-xs">
                {sample.testResults.map((test, idx) => (
                  <div key={idx} className="flex items-center gap-2 py-1.5">
                    <span className="font-medium flex-1">{test.parameter}</span>
                    {test.resultValue ? (
                      <span className="font-mono font-semibold">{test.resultValue} {test.unit || ""}</span>
                    ) : (
                      <span className={`text-xs ${testStatusColor[test.status] || "text-gray-500"}`}>
                        {test.status === "pending" ? "Pending" : test.status === "in_progress" ? "In Progress" : test.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground">
          Last updated: {format(sample.updatedAt, "dd MMM yyyy, HH:mm")} | ID: {sample.id}
        </p>
      </div>
    </div>
  )
}
