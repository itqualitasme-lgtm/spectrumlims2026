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
    // Pre-fill existing values
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

    // Collect all results that have values
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
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSample.testResults.map((tr) => (
                      <TableRow key={tr.id}>
                        <TableCell className="font-medium">
                          {tr.parameter}
                        </TableCell>
                        <TableCell>{tr.testMethod || "-"}</TableCell>
                        <TableCell>{tr.unit || "-"}</TableCell>
                        <TableCell>
                          <Input
                            value={resultValues[tr.id] || ""}
                            onChange={(e) =>
                              handleResultChange(tr.id, e.target.value)
                            }
                            placeholder="Enter result..."
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>{tr.specMin || "-"}</TableCell>
                        <TableCell>{tr.specMax || "-"}</TableCell>
                        <TableCell>{testStatusBadge(tr.status)}</TableCell>
                      </TableRow>
                    ))}
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
