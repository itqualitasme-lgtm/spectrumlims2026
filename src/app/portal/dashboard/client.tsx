"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  FlaskConical,
  Clock,
  CheckCircle,
  FileText,
  Receipt,
  AlertCircle,
  Download,
} from "lucide-react"
import { format } from "date-fns"

type PortalDashboardData = {
  totalSamples: number
  pendingSamples: number
  completedSamples: number
  totalReports: number
  publishedReports: number
  totalInvoices: number
  paidInvoices: number
  outstandingAmount: number
  recentSamples: any[]
  recentReports: any[]
}

function formatDate(date: string) {
  return format(new Date(date), "dd MMM yyyy")
}

function formatCurrency(amount: number) {
  return `AED ${amount.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

type StatCardProps = {
  title: string
  value: string | number
  description?: string
  icon: React.ReactNode
  iconColor?: string
  iconBg?: string
}

function StatCard({
  title,
  value,
  description,
  icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`rounded-lg p-2 ${iconBg}`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

export function PortalDashboardClient({ data }: { data: PortalDashboardData }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome. Here is an overview of your account.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Samples"
          value={data.totalSamples}
          description="All submitted samples"
          icon={<FlaskConical className="h-4 w-4" />}
          iconColor="text-cyan-600"
          iconBg="bg-cyan-100"
        />
        <StatCard
          title="Pending"
          value={data.pendingSamples}
          description="In progress or awaiting results"
          icon={<Clock className="h-4 w-4" />}
          iconColor="text-amber-600"
          iconBg="bg-amber-100"
        />
        <StatCard
          title="Completed"
          value={data.completedSamples}
          description="Completed or reported"
          icon={<CheckCircle className="h-4 w-4" />}
          iconColor="text-green-600"
          iconBg="bg-green-100"
        />
        <StatCard
          title="Published Reports"
          value={data.publishedReports}
          description={`${data.totalReports} total reports`}
          icon={<FileText className="h-4 w-4" />}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-100"
        />
        <StatCard
          title="Total Invoices"
          value={data.totalInvoices}
          description={`${data.paidInvoices} paid`}
          icon={<Receipt className="h-4 w-4" />}
          iconColor="text-violet-600"
          iconBg="bg-violet-100"
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(data.outstandingAmount)}
          description="Sent and overdue invoices"
          icon={<AlertCircle className="h-4 w-4" />}
          iconColor="text-red-600"
          iconBg="bg-red-100"
        />
      </div>

      {/* Recent Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Samples */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Samples</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentSamples.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No samples found.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sample #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentSamples.map((sample: any) => (
                    <TableRow key={sample.id}>
                      <TableCell className="font-medium">
                        {sample.sampleNumber}
                      </TableCell>
                      <TableCell>{sample.sampleType?.name ?? "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={getSampleStatusVariant(sample.status) as any}
                          className={getSampleStatusClass(sample.status)}
                        >
                          {sample.status.charAt(0).toUpperCase() + sample.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(sample.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentReports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No published reports found.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report #</TableHead>
                    <TableHead>Sample #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentReports.map((report: any) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        {report.reportNumber}
                      </TableCell>
                      <TableCell>
                        {report.sample?.sampleNumber ?? "-"}
                      </TableCell>
                      <TableCell>{formatDate(report.createdAt)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(`/api/reports/${report.id}/coa`, "_blank")
                          }
                        >
                          <Download className="mr-1 h-4 w-4" />
                          COA
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
