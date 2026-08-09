import { TRPCError } from "@trpc/server";

type BranchScopedUser = {
  role: string;
  preferredBranchId: number | null;
};

export function resolveKitchenBranch(user: BranchScopedUser, requestedBranchId?: number): number | undefined {
  if (user.role !== "kitchen") return requestedBranchId;

  const assignedBranchId = user.preferredBranchId ?? undefined;
  if (!assignedBranchId) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Kitchen account has no assigned branch" });
  }
  if (requestedBranchId !== undefined && requestedBranchId !== assignedBranchId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Kitchen account cannot access another branch" });
  }
  return assignedBranchId;
}

export function requireKitchenBranch(user: BranchScopedUser, requestedBranchId?: number): number {
  const branchId = resolveKitchenBranch(user, requestedBranchId);
  if (!branchId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Select a branch before continuing" });
  }
  return branchId;
}

export function assertKitchenBranchAccess(user: BranchScopedUser, branchId: number): void {
  resolveKitchenBranch(user, branchId);
}
