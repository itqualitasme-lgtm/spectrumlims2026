import {
  LayoutDashboard,
  Users,
  FlaskConical,
  ClipboardList,
  TestTube,
  FileText,
  Receipt,
  FileSpreadsheet,
  Settings,
  Shield,
  ScrollText,
  FileCheck,
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
        title: "Reports",
        href: "/process/reports",
        icon: FileText,
        permission: "process:view",
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
        title: "Invoices",
        href: "/accounts/invoices",
        icon: Receipt,
        permission: "accounts:view",
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
