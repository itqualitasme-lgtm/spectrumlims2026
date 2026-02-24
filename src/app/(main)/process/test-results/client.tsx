"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { SearchableSelect } from "@/components/shared/searchable-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

import { batchUpdateTestResults } from "@/actions/test-results"

type TestResult = {
  id: string
  parameter: string
  testMethod: string | null
  unit: string | null
  resultValue: string | null
  specMin: string | null
  specMax: string | null
  tat: number | null
  dueDate: string | null
  status: string
}

type Sample = {
  id: string
  sampleNumber: string
  status: string
  client: { id: string; name: string; company: string | null }
  sampleType: { id: string; name: string }
  testResults: TestResult[]
}

function getPassFail(
  value: string,
  specMin: string | null,
  specMax: string | null
): "pass" | "fail" | null {
  if (!value.trim()) return null
  const num = parseFloat(value)
  if (isNaN(num)) return null
  const min = specMin ? parseFloat(specMin) : null
  const max = specMax ? parseFloat(specMax) : null
  if (min === null && max === null) return null
  if (min !== null && !isNaN(min) && num < min) return "fail"
  if (max !== null && !isNaN(max) && num > max) return "fail"
  return "pass"
}

function isDueSoon(dueDate: string | null): "overdue" | "due-today" | "due-soon" | null {
  if (!dueDate) return null
  const due = new Date(dueDate)
  const now = new Date()
  const diffMs = due.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  if (diffDays < 0) return "overdue"
  if (diffDays < 1) return "due-today"
  if (diffDays < 2) return "due-soon"
  return null
}

export function TestResultsClient({ samples }: { samples: Sample[] }) {
  const router = useRouter()
  const [selectedSampleId, setSelectedSampleId] = useState("")
  const [resultValues, setResultValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const selectedSample = samples.find((s) => s.id === selectedSampleId)

  const sampleOptions = samples.map((s) => ({
    value: s.id,
    label: `${s.sampleNumber} - ${s.client.company || s.client.name} - ${s.sampleType.name}`,
  }))

  const handleSampleSelect = (sampleId: string) => {
    setSelectedSampleId(sampleId)
    const sample = samples.find((s) => s.id === sampleId)
    if (sample) {
      const values: Record<string, string> = {}
      sample.testResults.forEach((tr) => {
        values[tr.id] = tr.resultValue || ""
      })
      setResultValues(values)
    }
  }

  const handleResultChange = (testResultId: string, value: string) => {
    setResultValues((prev) => ({ ...prev, [testResultId]: value }))
  }

  const handleSaveAll = async () => {
    if (!selectedSample) return

    const results = selectedSample.testResults
      .filter((tr) => resultValues[tr.id]?.trim())
      .map((tr) => ({
        id: tr.id,
        resultValue: resultValues[tr.id].trim(),
      }))

    if (results.length === 0) {
      toast.error("Please enter at least one result value")
      return
    }

    setLoading(true)
    try {
      await batchUpdateTestResults(selectedSample.id, results)
      toast.success(
        `Saved ${results.length} result(s) for ${selectedSample.sampleNumber}`
      )
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to save results")
    } finally {
      setLoading(false)
    }
  }

  const completedCount = selectedSample?.testResults.filter(
    (tr) => resultValues[tr.id]?.trim() || tr.status === "completed"
  ).length || 0
  const totalCount = selectedSample?.testResults.length || 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test Results Entry"
        description="Enter and manage test results for assigned samples"
      />

      {/* Sample Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Sample</CardTitle>
          <CardDescription>
            Choose a sample to enter or update test results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-lg">
            <Label>Sample</Label>
            <SearchableSelect
              options={sampleOptions}
              value={selectedSampleId}
              onValueChange={handleSampleSelect}
              placeholder="Select a sample..."
              searchPlaceholder="Search by sample number, client, or type..."
              emptyMessage="No assigned samples found."
            />
          </div>
        </CardContent>
      </Card>

      {/* Test Results Entry */}
      {selectedSample && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Test Parameters - {selectedSample.sampleNumber}
                </CardTitle>
                <CardDescription>
                  {selectedSample.client.company || selectedSample.client.name} -{" "}
                  {selectedSample.sampleType.name}
                  <span className="ml-2">
                    ({completedCount}/{totalCount} entered)
                  </span>
                </CardDescription>
              </div>
              <Button onClick={handleSaveAll} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save All Results
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedSample.testResults.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parameter</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="w-[180px]">Result</TableHead>
                      <TableHead>Spec Min</TableHead>
                      <TableHead>Spec Max</TableHead>
                      <TableHead>TAT</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSample.testResults.map((tr) => {
                      const currentValue = resultValues[tr.id] || ""
                      const passFail = getPassFail(currentValue, tr.specMin, tr.specMax)
                      const dueStatus = isDueSoon(tr.dueDate)

                      return (
                        <TableRow key={tr.id}>
                          <TableCell className="font-medium">
                            {tr.parameter}
                          </TableCell>
                          <TableCell>{tr.testMethod || "-"}</TableCell>
                          <TableCell>{tr.unit || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                value={currentValue}
                                onChange={(e) =>
                                  handleResultChange(tr.id, e.target.value)
                                }
                                placeholder="Enter result..."
                                className={`h-8 ${
                                  passFail === "fail"
                                    ? "border-red-400 focus-visible:ring-red-400"
                                    : passFail === "pass"
                                      ? "border-green-400 focus-visible:ring-green-400"
                                      : ""
                                }`}
                              />
                              {passFail === "pass" && (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 shrink-0 text-[10px] px-1.5">Pass</Badge>
                              )}
                              {passFail === "fail" && (
                                <Badge className="bg-red-100 text-red-800 hover:bg-red-100 shrink-0 text-[10px] px-1.5">Fail</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{tr.specMin || "-"}</TableCell>
                          <TableCell>{tr.specMax || "-"}</TableCell>
                          <TableCell>
                            {tr.tat ? `${tr.tat}d` : "-"}
                          </TableCell>
                          <TableCell>
                            {tr.dueDate ? (
                              <span className={
                                dueStatus === "overdue" ? "text-red-600 font-medium" :
                                dueStatus === "due-today" ? "text-orange-600 font-medium" :
                                dueStatus === "due-soon" ? "text-yellow-600" : ""
                              }>
                                {new Date(tr.dueDate).toLocaleDateString()}
                                {dueStatus === "overdue" && " (Overdue)"}
                                {dueStatus === "due-today" && " (Today)"}
                              </span>
                            ) : "-"}
                          </TableCell>
                          <TableCell>
                            {tr.status === "pending" ? (
                              <Badge variant="secondary">Pending</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No test parameters defined for this sample.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {samples.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              No samples are currently assigned for testing.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
