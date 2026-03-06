"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  Users,
  ClipboardList,
  FileText,
  Receipt,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
} from "lucide-react"
import { format } from "date-fns"

type DashboardData = {
  roleName: string
  totalSamples: number
  pendingSamples: number
  inProgressSamples: number
  completedSamples: number
  totalReports: number
  totalInvoices: number
  totalEmployees: number
  totalClients: number
  totalRevenue: number
  outstandingAmount: number
  myAssigned: number
  myPendingResults: number
  todayCollections: number
  recentSamples: any[]
  recentReports: any[]
}

function formatDate(date: string) {
  return format(new Date(date), "dd MMM yyyy")
}

function formatCurrency(amount: number) {
  return `AED ${amount.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ---- Status badge helpers ----

function getSampleStatusVariant(status: string) {
  switch (status) {
    case "pending":
      return "secondary"
    case "registered":
      return "outline"
    case "assigned":
      return "default"
    case "testing":
      return "default"
    case "completed":
      return "default"
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

function getReportStatusVariant(status: string) {
  switch (status) {
    case "draft":
      return "secondary"
    case "review":
      return "default"
    case "approved":
      return "default"
    case "published":
      return "default"
    default:
      return "secondary"
  }
}

function getReportStatusClass(status: string) {
  switch (status) {
    case "review":
      return "bg-yellow-500 text-white hover:bg-yellow-500/90"
    case "approved":
      return "bg-blue-600 text-white hover:bg-blue-600/90"
    case "published":
      return "bg-green-600 text-white hover:bg-green-600/90"
    default:
      return ""
  }
}

// ---- Stat Card ----

type StatCardProps = {
  title: string
  value: string | number
  description?: string
  icon: React.ReactNode
  iconColor?: string
  iconBg?: string
}

function StatCard({ title, value, description, icon, iconColor = "text-primary", iconBg = "bg-primary/10" }: StatCardProps) {
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

// ---- Role-specific stat card grids ----

function AdminStats({ data }: { data: DashboardData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Total Employees"
        value={data.totalEmployees}
        description="Active lab staff"
        icon={<Users className="h-4 w-4" />}
        iconColor="text-violet-600"
        iconBg="bg-violet-100"
      />
      <StatCard
        title="Total Clients"
        value={data.totalClients}
        description="Registered customers"
        icon={<Users className="h-4 w-4" />}
        iconColor="text-blue-600"
        iconBg="bg-blue-100"
      />
      <StatCard
        title="Total Samples"
        value={data.totalSamples}
        description="All time"
        icon={<FlaskConical className="h-4 w-4" />}
        iconColor="text-cyan-600"
        iconBg="bg-cyan-100"
      />
      <StatCard
        title="Pending"
        value={data.pendingSamples}
        description="Awaiting processing"
        icon={<Clock className="h-4 w-4" />}
        iconColor="text-amber-600"
        iconBg="bg-amber-100"
      />
      <StatCard
        title="In Progress"
        value={data.inProgressSamples}
        description="Assigned or testing"
        icon={<ClipboardList className="h-4 w-4" />}
        iconColor="text-blue-600"
        iconBg="bg-blue-100"
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
        title="Reports"
        value={data.totalReports}
        description="Generated reports"
        icon={<FileText className="h-4 w-4" />}
        iconColor="text-indigo-600"
        iconBg="bg-indigo-100"
      />
      <StatCard
        title="Revenue"
        value={formatCurrency(data.totalRevenue)}
        description="From paid invoices"
        icon={<TrendingUp className="h-4 w-4" />}
        iconColor="text-emerald-600"
        iconBg="bg-emerald-100"
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
  )
}

function LabManagerStats({ data }: { data: DashboardData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Total Samples"
        value={data.totalSamples}
        description="All time"
        icon={<FlaskConical className="h-4 w-4" />}
        iconColor="text-cyan-600"
        iconBg="bg-cyan-100"
      />
      <StatCard
        title="Pending"
        value={data.pendingSamples}
        description="Awaiting processing"
        icon={<Clock className="h-4 w-4" />}
        iconColor="text-amber-600"
        iconBg="bg-amber-100"
      />
      <StatCard
        title="In Progress"
        value={data.inProgressSamples}
        description="Assigned or testing"
        icon={<ClipboardList className="h-4 w-4" />}
        iconColor="text-blue-600"
        iconBg="bg-blue-100"
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
        title="Reports"
        value={data.totalReports}
        description="Generated reports"
        icon={<FileText className="h-4 w-4" />}
        iconColor="text-indigo-600"
        iconBg="bg-indigo-100"
      />
      <StatCard
        title="Clients"
        value={data.totalClients}
        description="Registered customers"
        icon={<Users className="h-4 w-4" />}
        iconColor="text-violet-600"
        iconBg="bg-violet-100"
      />
    </div>
  )
}

function ChemistStats({ data }: { data: DashboardData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="My Assigned"
        value={data.myAssigned}
        description="Samples assigned to you"
        icon={<ClipboardList className="h-4 w-4" />}
        iconColor="text-blue-600"
        iconBg="bg-blue-100"
      />
      <StatCard
        title="Pending Results"
        value={data.myPendingResults}
        description="Tests awaiting results"
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
        title="Total Reports"
        value={data.totalReports}
        description="Generated reports"
        icon={<FileText className="h-4 w-4" />}
        iconColor="text-indigo-600"
        iconBg="bg-indigo-100"
      />
    </div>
  )
}

function AccountsStats({ data }: { data: DashboardData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Invoices"
        value={data.totalInvoices}
        description="All invoices"
        icon={<Receipt className="h-4 w-4" />}
        iconColor="text-indigo-600"
        iconBg="bg-indigo-100"
      />
      <StatCard
        title="Revenue"
        value={formatCurrency(data.totalRevenue)}
        description="From paid invoices"
        icon={<TrendingUp className="h-4 w-4" />}
        iconColor="text-emerald-600"
        iconBg="bg-emerald-100"
      />
      <StatCard
        title="Outstanding"
        value={formatCurrency(data.outstandingAmount)}
        description="Sent and overdue invoices"
        icon={<AlertCircle className="h-4 w-4" />}
        iconColor="text-red-600"
        iconBg="bg-red-100"
      />
      <StatCard
        title="Total Clients"
        value={data.totalClients}
        description="Registered customers"
        icon={<Users className="h-4 w-4" />}
        iconColor="text-violet-600"
        iconBg="bg-violet-100"
      />
    </div>
  )
}

function RegistrationStats({ data }: { data: DashboardData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Samples"
        value={data.totalSamples}
        description="All time"
        icon={<FlaskConical className="h-4 w-4" />}
        iconColor="text-cyan-600"
        iconBg="bg-cyan-100"
      />
      <StatCard
        title="Pending"
        value={data.pendingSamples}
        description="Awaiting registration"
        icon={<Clock className="h-4 w-4" />}
        iconColor="text-amber-600"
        iconBg="bg-amber-100"
      />
      <StatCard
        title="Active Clients"
        value={data.totalClients}
        description="Registered customers"
        icon={<Users className="h-4 w-4" />}
        iconColor="text-violet-600"
        iconBg="bg-violet-100"
      />
      <StatCard
        title="Today"
        value={data.inProgressSamples}
        description="Samples in progress today"
        icon={<ClipboardList className="h-4 w-4" />}
        iconColor="text-blue-600"
        iconBg="bg-blue-100"
      />
    </div>
  )
}

function SamplerStats({ data }: { data: DashboardData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Today's Collections"
        value={data.todayCollections}
        description="Samples collected today"
        icon={<MapPin className="h-4 w-4" />}
        iconColor="text-emerald-600"
        iconBg="bg-emerald-100"
      />
      <StatCard
        title="Total Samples Collected"
        value={data.totalSamples}
        description="All time"
        icon={<FlaskConical className="h-4 w-4" />}
        iconColor="text-cyan-600"
        iconBg="bg-cyan-100"
      />
      <StatCard
        title="Status"
        value={data.pendingSamples}
        description="Pending samples"
        icon={<Clock className="h-4 w-4" />}
        iconColor="text-amber-600"
        iconBg="bg-amber-100"
      />
    </div>
  )
}

function RoleStats({ data }: { data: DashboardData }) {
  switch (data.roleName) {
    case "Admin":
      return <AdminStats data={data} />
    case "Lab Manager":
      return <LabManagerStats data={data} />
    case "Chemist":
      return <ChemistStats data={data} />
    case "Accounts":
      return <AccountsStats data={data} />
    case "Registration":
      return <RegistrationStats data={data} />
    case "Sampler":
      return <SamplerStats data={data} />
    default:
      return <LabManagerStats data={data} />
  }
}

// ---- Recent tables ----

function RecentSamplesTable({ samples }: { samples: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Samples</CardTitle>
      </CardHeader>
      <CardContent>
        {samples.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No samples found.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sample #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {samples.map((sample: any) => (
                <TableRow key={sample.id}>
                  <TableCell className="font-medium">
                    {sample.sampleNumber}
                  </TableCell>
                  <TableCell>{sample.client?.name ?? "-"}</TableCell>
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
  )
}

function RecentReportsTable({ reports }: { reports: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Reports</CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No reports found.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report #</TableHead>
                <TableHead>Sample</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report: any) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    {report.reportNumber}
                  </TableCell>
                  <TableCell>
                    {report.sample?.sampleNumber ?? "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getReportStatusVariant(report.status) as any}
                      className={getReportStatusClass(report.status)}
                    >
                      {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(report.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// ---- Main Dashboard Client ----

export function DashboardClient({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back. Here is an overview of your lab.
        </p>
      </div>

      <RoleStats data={data} />

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentSamplesTable samples={data.recentSamples} />
        <RecentReportsTable reports={data.recentReports} />
      </div>
    </div>
  )
}
