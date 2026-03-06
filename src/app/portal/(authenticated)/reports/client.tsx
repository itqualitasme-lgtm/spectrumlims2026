"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"

import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

type Report = {
  id: string
  reportNumber: string
  title: string | null
  status: string
  createdAt: string
  sample: {
    id: string
    sampleNumber: string
    sampleType: {
      id: string
      name: string
    }
  }
}

function formatDate(date: string) {
  return format(new Date(date), "dd MMM yyyy")
}

function getReportStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge variant="secondary">Draft</Badge>
    case "review":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Review</Badge>
    case "approved":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Approved</Badge>
    case "published":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Published</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export function PortalReportsClient({ reports }: { reports: Report[] }) {
  const columns: ColumnDef<Report, any>[] = [
    {
      accessorKey: "reportNumber",
      header: "Report #",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.reportNumber}</span>
      ),
    },
    {
      accessorKey: "sample.sampleNumber",
      header: "Sample #",
      cell: ({ row }) => row.original.sample?.sampleNumber ?? "-",
    },
    {
      id: "sampleType",
      header: "Sample Type",
      cell: ({ row }) => row.original.sample?.sampleType?.name ?? "-",
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => row.original.title || "-",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getReportStatusBadge(row.original.status),
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const report = row.original
        const canDownload = report.status === "published" || report.status === "approved"

        if (!canDownload) return null

        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(`/api/reports/${report.id}/coa`, "_blank")
            }
          >
            <Download className="mr-1 h-4 w-4" />
            Download COA
          </Button>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Reports"
        description="View and download your published laboratory reports"
      />

      <DataTable
        columns={columns}
        data={reports}
        searchPlaceholder="Search reports..."
        searchKey="reportNumber"
      />
    </div>
  )
}
