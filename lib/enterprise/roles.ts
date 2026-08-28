export function canMutateEnterprise(role: string): boolean {
  return role !== "read_only" && role !== "supplier_contributor";
}
