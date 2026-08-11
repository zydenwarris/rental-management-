import type { RequestContext } from "./types.js";

export type DeletionGuard = (id: string, ctx: RequestContext) => Promise<void>;

/**
 * Lets one module veto deletions in another without either importing the other's
 * internals: units guard property deletion, leases guard unit and tenant deletion.
 * The owning service runs `assertAllPass` before deleting; a guard vetoes by
 * throwing an ApiError.
 */
export class GuardRegistry {
  private readonly guards: DeletionGuard[] = [];

  register(guard: DeletionGuard): void {
    this.guards.push(guard);
  }

  async assertAllPass(id: string, ctx: RequestContext): Promise<void> {
    for (const guard of this.guards) {
      await guard(id, ctx);
    }
  }
}
