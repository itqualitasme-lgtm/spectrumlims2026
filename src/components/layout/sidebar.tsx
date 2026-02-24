"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ChevronLeft, ChevronDown, ChevronRight } from "lucide-react"
import { menuGroups } from "@/lib/menu-items"
import { hasPermission } from "@/lib/permissions-client"

interface SidebarProps {
  permissions: string[]
  roleName: string
}

export default function Sidebar({ permissions, roleName }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // Find which group contains the active route
  const activeGroup = menuGroups.find((g) =>
    g.items.some(
      (item) => pathname === item.href || pathname.startsWith(item.href + "/")
    )
  )
  const [expandedGroup, setExpandedGroup] = useState<string | null>(
    activeGroup?.title || null
  )

  const toggleGroup = (title: string) => {
    setExpandedGroup((prev) => (prev === title ? null : title))
  }

  const filteredGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.permission) return true
        const [module, action] = item.permission.split(":")
        return hasPermission(permissions, module, action, roleName)
      }),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-red.png"
            alt="SPECTRUM LIMS"
            width={28}
            height={28}
            className="rounded"
          />
          {!collapsed && (
            <span className="text-lg font-bold">SPECTRUM LIMS</span>
          )}
        </Link>
      </div>

      {/* Menu */}
      <ScrollArea className="min-h-0 flex-1 py-2">
        <nav className="space-y-1 px-2">
          {filteredGroups.map((group) => (
            <div key={group.title} className="mb-2">
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  {group.title}
                  {expandedGroup === group.title ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              )}
              {(collapsed || expandedGroup === group.title) &&
                group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/")
                  const Icon = item.icon

                  if (collapsed) {
                    return (
                      <Tooltip key={item.href} delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex h-9 w-full items-center justify-center rounded-md transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {item.title}
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.title}
                    </Link>
                  )
                })}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Collapse Toggle */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </Button>
      </div>
    </aside>
  )
}
