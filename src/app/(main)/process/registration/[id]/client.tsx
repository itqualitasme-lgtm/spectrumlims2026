"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, UserPlus, Loader2, Printer } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { SearchableSelect } from "@/components/shared/searchable-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { assignSample, getChemistsForSelect } from "@/actions/registrations"

type TestResult = {
  id: string
  parameter: string
  testMethod: string | null
  unit: string | null
  resultValue: string | null
  specMin: string | null
  specMax: string | null
  status: string
  enteredBy: { name: string } | null
}

type Report = {
  id: string
  reportNumber: string
  title: string | null
  status: string
  createdAt: string
}

type SampleDetail = {
  id: string
  sampleNumber: string
  description: string | null
  quantity: string | null
  priority: string
  status: string
  jobType: string
  reference: string | null
  samplePoint: string | null
  notes: string | null
  createdAt: string
  registeredAt: string | null
  client: { id: string; name: string; company: string | null }
  sampleType: { id: string; name: string }
  assignedTo: { name: string } | null
  collectedBy: { name: string } | null
  registeredBy: { name: string } | null
  testResults: TestResult[]
  reports: Report[]
}

const statusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">Pending</Badge>
    case "registered":
      return <Badge variant="outline">Registered</Badge>
    case "assigned":
      return <Badge variant="default">Assigned</Badge>
    case "testing":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Testing</Badge>
    case "completed":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>
    case "reported":
      return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Reported</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

const priorityBadge = (priority: string) => {
  switch (priority) {
    case "normal":
      return <Badge variant="secondary">Normal</Badge>
    case "urgent":
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Urgent</Badge>
    case "rush":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rush</Badge>
    default:
      return <Badge variant="secondary">{priority}</Badge>
  }
}

const testStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">Pending</Badge>
    case "completed":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export function SampleDetailClient({ sample }: { sample: SampleDetail }) {
  const router = useRouter()
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignedToId, setAssignedToId] = useState("")
  const [chemists, setChemists] = useState<{ value: string; label: string }[]>([])
  const [loading, setLoading] = useState(false)

  const handleOpenAssign = async () => {
    try {
      const ch = await getChemistsForSelect()
      setChemists(ch.map((c) => ({ value: c.id, label: c.name })))
      setAssignedToId("")
      setAssignOpen(true)
    } catch {
      toast.error("Failed to load chemists")
    }
  }

  const handleAssign = async () => {
    if (!assignedToId) {
      toast.error("Please select a chemist")
      return
    }

    setLoading(true)
    try {
      await assignSample(sample.id, assignedToId)
      toast.success(`Sample ${sample.sampleNumber} assigned successfully`)
      setAssignOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to assign sample")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/process/registration">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <PageHeader title={`Sample ${sample.sampleNumber}`} />
      </div>

      {/* Sample Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sample Information</CardTitle>
              <CardDescription>Details for sample {sample.sampleNumber}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => window.open(`/api/samples/${sample.id}/label`, "_blank")}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Label
              </Button>
              {["pending", "registered"].includes(sample.status) && (
                <Button onClick={handleOpenAssign}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sample Number</p>
              <p className="text-sm">{sample.sampleNumber}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Client</p>
              <p className="text-sm">
                {sample.client.company || sample.client.name}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sample Type</p>
              <p className="text-sm">{sample.sampleType.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Priority</p>
              <div className="mt-1">{priorityBadge(sample.priority)}</div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Job Type</p>
              <div className="mt-1">
                <Badge variant={sample.jobType === "survey" ? "default" : "outline"}>
                  {sample.jobType === "survey" ? "Survey" : "Testing"}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <div className="mt-1">{statusBadge(sample.status)}</div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Assigned To</p>
              <p className="text-sm">{sample.assignedTo?.name || "-"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Collected By</p>
              <p className="text-sm">{sample.collectedBy?.name || "-"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Registered By</p>
              <p className="text-sm">{sample.registeredBy?.name || "-"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Date</p>
              <p className="text-sm">
                {new Date(sample.createdAt).toLocaleDateString()}
              </p>
            </div>
            {sample.reference && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Reference / PO</p>
                <p className="text-sm">{sample.reference}</p>
              </div>
            )}
            {sample.quantity && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quantity</p>
                <p className="text-sm">{sample.quantity}</p>
              </div>
            )}
            {sample.samplePoint && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sample Point</p>
                <p className="text-sm">{sample.samplePoint}</p>
              </div>
            )}
            {sample.description && (
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="text-sm">{sample.description}</p>
              </div>
            )}
            {sample.notes && (
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Notes</p>
                <p className="text-sm">{sample.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Results Section */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>
            {sample.testResults.length} test parameter(s) for this sample
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sample.testResults.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parameter</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Spec Min</TableHead>
                    <TableHead>Spec Max</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sample.testResults.map((tr) => (
                    <TableRow key={tr.id}>
                      <TableCell className="font-medium">{tr.parameter}</TableCell>
                      <TableCell>{tr.testMethod || "-"}</TableCell>
                      <TableCell>{tr.unit || "-"}</TableCell>
                      <TableCell>{tr.resultValue || "-"}</TableCell>
                      <TableCell>{tr.specMin || "-"}</TableCell>
                      <TableCell>{tr.specMax || "-"}</TableCell>
                      <TableCell>{testStatusBadge(tr.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No test parameters defined for this sample.</p>
          )}
        </CardContent>
      </Card>

      {/* Reports Section */}
      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>
            {sample.reports.length} report(s) associated with this sample
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sample.reports.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sample.reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        <Link
                          href="/process/reports"
                          className="text-primary hover:underline"
                        >
                          {report.reportNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{report.title || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{report.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(report.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No reports for this sample yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Assign Sample</DialogTitle>
            <DialogDescription>
              Assign {sample.sampleNumber} to a chemist for testing.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Assign To *</Label>
              <SearchableSelect
                options={chemists}
                value={assignedToId}
                onValueChange={setAssignedToId}
                placeholder="Select a chemist..."
                searchPlaceholder="Search chemists..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
