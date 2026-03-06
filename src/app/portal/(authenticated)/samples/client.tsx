"use client"

import { useState } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"

import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Eye } from "lucide-react"

type TestResult = {
  id: string
  parameter: string
  testMethod: string | null
  resultValue: string | null
  unit: string | null
  specMin: string | null
  specMax: string | null
  status: string
}

type Sample = {
  id: string
  sampleNumber: string
  description: string | null
  quantity: number | null
  priority: string
  status: string
  notes: string | null
  createdAt: string
  sampleType: {
    id: string
    name: string
  }
  testResults: TestResult[]
}

function formatDate(date: string) {
  return format(new Date(date), "dd MMM yyyy")
}

function getSampleStatusVariant(status: string) {
  switch (status) {
    case "pending":
      return "secondary"
    case "registered":
      return "outline"
    case "assigned":
    case "testing":
      return "default"
    case "completed":
    case "reported":
      return "default"
    default:
      return "secondary"
  }
}

function getSampleStatusClass(status: string) {
  switch (status) {
    case "testing":
      return "bg-blue-600 text-white hover:bg-blue-600/90"
    case "completed":
      return "bg-green-600 text-white hover:bg-green-600/90"
    case "reported":
      return "bg-emerald-600 text-white hover:bg-emerald-600/90"
    default:
      return ""
  }
}

function getPriorityVariant(priority: string) {
  switch (priority) {
    case "urgent":
      return "destructive"
    case "high":
      return "default"
    case "normal":
      return "secondary"
    case "low":
      return "outline"
    default:
      return "secondary"
  }
}

function getTestResultStatusClass(status: string) {
  switch (status) {
    case "pass":
      return "bg-green-100 text-green-800 hover:bg-green-100"
    case "fail":
      return "bg-red-100 text-red-800 hover:bg-red-100"
    case "pending":
      return ""
    default:
      return ""
  }
}

function getTestResultStatusVariant(status: string) {
  switch (status) {
    case "pass":
      return "default"
    case "fail":
      return "destructive"
    case "pending":
      return "secondary"
    default:
      return "secondary"
  }
}

export function PortalSamplesClient({ samples }: { samples: Sample[] }) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null)

  function openDetail(sample: Sample) {
    setSelectedSample(sample)
    setDetailOpen(true)
  }

  const columns: ColumnDef<Sample, any>[] = [
    {
      accessorKey: "sampleNumber",
      header: "Sample #",
      cell: ({ row }) => (
        <Button
          variant="link"
          className="p-0 h-auto font-medium"
          onClick={() => openDetail(row.original)}
        >
          {row.original.sampleNumber}
        </Button>
      ),
    },
    {
      accessorKey: "sampleType.name",
      header: "Type",
      cell: ({ row }) => row.original.sampleType?.name ?? "-",
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => row.original.description || "-",
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => (
        <Badge variant={getPriorityVariant(row.original.priority) as any}>
          {row.original.priority.charAt(0).toUpperCase() + row.original.priority.slice(1)}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={getSampleStatusVariant(row.original.status) as any}
          className={getSampleStatusClass(row.original.status)}
        >
          {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openDetail(row.original)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Samples"
        description="View all your submitted samples and test results"
      />

      <DataTable
        columns={columns}
        data={samples}
        searchPlaceholder="Search samples..."
        searchKey="sampleNumber"
      />

      {/* Sample Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Sample Details - {selectedSample?.sampleNumber}
            </DialogTitle>
          </DialogHeader>

          {selectedSample && (
            <div className="space-y-4">
              {/* Sample Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Sample Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Sample #:</span>
                      <span className="ml-2 font-medium">{selectedSample.sampleNumber}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <span className="ml-2 font-medium">{selectedSample.sampleType?.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <span className="ml-2">
                        <Badge
                          variant={getSampleStatusVariant(selectedSample.status) as any}
                          className={getSampleStatusClass(selectedSample.status)}
                        >
                          {selectedSample.status.charAt(0).toUpperCase() + selectedSample.status.slice(1)}
                        </Badge>
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Priority:</span>
                      <span className="ml-2">
                        <Badge variant={getPriorityVariant(selectedSample.priority) as any}>
                          {selectedSample.priority.charAt(0).toUpperCase() + selectedSample.priority.slice(1)}
                        </Badge>
                      </span>
                    </div>
                    {selectedSample.description && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Description:</span>
                        <span className="ml-2">{selectedSample.description}</span>
                      </div>
                    )}
                    {selectedSample.quantity && (
                      <div>
                        <span className="text-muted-foreground">Quantity:</span>
                        <span className="ml-2">{selectedSample.quantity}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <span className="ml-2">{formatDate(selectedSample.createdAt)}</span>
                    </div>
                    {selectedSample.notes && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Notes:</span>
                        <span className="ml-2">{selectedSample.notes}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Test Results */}
              <Separator />
              <div>
                <h3 className="text-base font-semibold mb-3">Test Results</h3>
                {selectedSample.testResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No test results available yet.
                  </p>
                ) : (
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
                        {selectedSample.testResults.map((result) => (
                          <TableRow key={result.id}>
                            <TableCell className="font-medium">
                              {result.parameter}
                            </TableCell>
                            <TableCell>{result.testMethod || "-"}</TableCell>
                            <TableCell>{result.unit || "-"}</TableCell>
                            <TableCell>{result.resultValue || "-"}</TableCell>
                            <TableCell>{result.specMin || "-"}</TableCell>
                            <TableCell>{result.specMax || "-"}</TableCell>
                            <TableCell>
                              <Badge
                                variant={getTestResultStatusVariant(result.status) as any}
                                className={getTestResultStatusClass(result.status)}
                              >
                                {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
