export function hasPermission(
  permissions: string[],
  module: string,
  action: string,
  roleName?: string
): boolean {
  if (roleName === "Admin") return true
  return permissions.includes(`${module}:${action}`)
}
