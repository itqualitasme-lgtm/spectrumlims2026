"use client"

import { useMemo, useState } from "react"
import { DataTable } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { Activity, Layers, MousePointerClick } from "lucide-react"

interface AuditLog {
  id: string
  userId: string | null
  userName: string | null
  module: string
  action: string
  details: string | null
  labId: string
  createdAt: string
}

interface AuditLogsClientProps {
  logs: AuditLog[]
  totalCount: number
  moduleCounts: Record<string, number>
  actionCounts: Record<string, number>
}

function getActionBadgeVariant(action: string) {
  switch (action.toLowerCase()) {
    case "create":
      return "bg-green-100 text-green-800 hover:bg-green-100"
    case "edit":
    case "update":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100"
    case "delete":
      return "bg-red-100 text-red-800 hover:bg-red-100"
    default:
      return ""
  }
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function truncate(str: string, length: number) {
  if (str.length <= length) return str
  return str.slice(0, length) + "..."
}

export function AuditLogsClient({
  logs,
  totalCount,
  moduleCounts,
  actionCounts,
}: AuditLogsClientProps) {
  const columns: ColumnDef<AuditLog, any>[] = useMemo(
    () => [
      {
        accessorKey: "createdAt",
        header: "Date/Time",
        cell: ({ row }) =>
          format(new Date(row.original.createdAt), "dd MMM yyyy HH:mm"),
      },
      {
        accessorKey: "userName",
        header: "User",
        cell: ({ row }) => row.original.userName || "System",
      },
      {
        accessorKey: "module",
        header: "Module",
        cell: ({ row }) => (
          <Badge variant="outline">{capitalize(row.original.module)}</Badge>
        ),
      },
      {
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => {
          const action = row.original.action
          const colorClass = getActionBadgeVariant(action)
          return (
            <Badge
              variant={colorClass ? "default" : "secondary"}
              className={colorClass}
            >
              {capitalize(action)}
            </Badge>
          )
        },
      },
      {
        accessorKey: "details",
        header: "Details",
        enableSorting: false,
        cell: ({ row }) => {
          const details = row.original.details
          if (!details) return <span className="text-muted-foreground">-</span>
          if (details.length <= 60) return <span>{details}</span>
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help">{truncate(details, 60)}</span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-sm">
                  <p>{details}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        },
      },
    ],
    []
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="System activity log"
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Total Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              By Module
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(moduleCounts).map(([module, count]) => (
                <Badge key={module} variant="outline">
                  {capitalize(module)}: {count}
                </Badge>
              ))}
              {Object.keys(moduleCounts).length === 0 && (
                <span className="text-sm text-muted-foreground">No data</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              By Action
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(actionCounts).map(([action, count]) => {
                const colorClass = getActionBadgeVariant(action)
                return (
                  <Badge
                    key={action}
                    variant={colorClass ? "default" : "secondary"}
                    className={colorClass}
                  >
                    {capitalize(action)}: {count}
                  </Badge>
                )
              })}
              {Object.keys(actionCounts).length === 0 && (
                <span className="text-sm text-muted-foreground">No data</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Log Table */}
      <DataTable
        columns={columns}
        data={logs}
        searchPlaceholder="Search by user or details..."
        searchKey="userName"
      />
    </div>
  )
}
