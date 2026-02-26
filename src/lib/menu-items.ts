import {
  LayoutDashboard,
  Users,
  FlaskConical,
  ClipboardList,
  TestTube,
  ShieldCheck,
  FileText,
  Receipt,
  FileSpreadsheet,
  FileSignature,
  Settings,
  Shield,
  ScrollText,
  FileCheck,
  Trash2,
  Activity,
  type LucideIcon,
} from "lucide-react"

export interface MenuItem {
  title: string
  href: string
  icon: LucideIcon
  permission?: string
}

export interface MenuGroup {
  title: string
  items: MenuItem[]
}

export const menuGroups: MenuGroup[] = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        permission: "dashboard:view",
      },
    ],
  },
  {
    title: "Masters",
    items: [
      {
        title: "Customers",
        href: "/masters/customers",
        icon: Users,
        permission: "masters:view",
      },
      {
        title: "Sample Types",
        href: "/masters/sample-types",
        icon: FlaskConical,
        permission: "masters:view",
      },
      {
        title: "Status Tracking",
        href: "/masters/status-tracking",
        icon: Activity,
        permission: "masters:view",
      },
    ],
  },
  {
    title: "Process",
    items: [
      {
        title: "Sample Registration",
        href: "/process/registration",
        icon: ClipboardList,
        permission: "process:view",
      },
      {
        title: "Test Results",
        href: "/process/test-results",
        icon: TestTube,
        permission: "process:view",
      },
      {
        title: "Authentication",
        href: "/process/authentication",
        icon: ShieldCheck,
        permission: "process:view",
      },
      {
        title: "Reports",
        href: "/process/reports",
        icon: FileText,
        permission: "process:view",
      },
      {
        title: "Deleted Registrations",
        href: "/process/trash/registrations",
        icon: Trash2,
        permission: "process:delete",
      },
    ],
  },
  {
    title: "Accounts",
    items: [
      {
        title: "Quotations",
        href: "/accounts/quotations",
        icon: FileSpreadsheet,
        permission: "accounts:view",
      },
      {
        title: "Contracts",
        href: "/accounts/contracts",
        icon: FileSignature,
        permission: "accounts:view",
      },
      {
        title: "Invoices",
        href: "/accounts/invoices",
        icon: Receipt,
        permission: "accounts:view",
      },
      {
        title: "Deleted Invoices",
        href: "/accounts/trash/invoices",
        icon: Trash2,
        permission: "accounts:delete",
      },
    ],
  },
  {
    title: "Admin",
    items: [
      {
        title: "Users",
        href: "/admin/users",
        icon: Users,
        permission: "admin:view",
      },
      {
        title: "Roles & Permissions",
        href: "/admin/roles",
        icon: Shield,
        permission: "admin:view",
      },
      {
        title: "Report Templates",
        href: "/admin/report-templates",
        icon: FileCheck,
        permission: "admin:view",
      },
      {
        title: "Audit Logs",
        href: "/admin/audit-logs",
        icon: ScrollText,
        permission: "admin:view",
      },
      {
        title: "Settings",
        href: "/admin/settings",
        icon: Settings,
        permission: "admin:view",
      },
    ],
  },
]
