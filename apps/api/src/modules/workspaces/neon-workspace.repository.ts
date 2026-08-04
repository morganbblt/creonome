import { randomUUID } from "node:crypto";
import { Inject, ServiceUnavailableException } from "@nestjs/common";
import {
  creditAccounts,
  creditLedger,
  creatorProfiles,
  type CreonomeDatabase,
  users,
  workspaceMembers,
  workspaces,
} from "@creonome/db";
import { and, eq, isNull } from "drizzle-orm";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { CREONOME_DATABASE } from "../database/database.module.js";
import type {
  WorkspaceContext,
  WorkspaceRepository,
} from "./workspace.repository.js";

export class NeonWorkspaceRepository implements WorkspaceRepository {
  constructor(
    @Inject(CREONOME_DATABASE)
    private readonly database: CreonomeDatabase | undefined,
  ) {}

  async findForAuthUser(authUserId: string): Promise<WorkspaceContext | null> {
    const database = this.requireDatabase();
    const [context] = await database
      .select({
        userId: users.id,
        workspaceId: workspaces.id,
        creatorProfileId: creatorProfiles.id,
      })
      .from(users)
      .innerJoin(workspaceMembers, eq(workspaceMembers.userId, users.id))
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .innerJoin(
        creatorProfiles,
        and(
          eq(creatorProfiles.workspaceId, workspaces.id),
          eq(creatorProfiles.userId, users.id),
        ),
      )
      .where(eq(users.authUserId, authUserId))
      .limit(1);

    return context ?? null;
  }

  async claimDemoWorkspace(
    principal: AuthPrincipal,
  ): Promise<WorkspaceContext | null> {
    const database = this.requireDatabase();
    const [demoUser] = await database
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.isDemo, true), isNull(users.authUserId)))
      .limit(1);

    if (!demoUser) {
      return null;
    }

    const claimed = await database
      .update(users)
      .set({
        authUserId: principal.subject,
        ...(principal.name ? { displayName: principal.name } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, demoUser.id), isNull(users.authUserId)))
      .returning({ id: users.id });

    if (claimed.length === 0) {
      return this.findForAuthUser(principal.subject);
    }

    return this.findForAuthUser(principal.subject);
  }

  async createPersonalWorkspace(
    principal: AuthPrincipal,
    initialCreditBalance: number,
  ): Promise<WorkspaceContext> {
    const database = this.requireDatabase();
    const userId = randomUUID();
    const workspaceId = randomUUID();
    const creatorProfileId = randomUUID();
    const displayName =
      principal.name ?? principal.email?.split("@")[0] ?? "Creator";
    const slug = `creator-${principal.subject.replaceAll("-", "").slice(0, 16)}`;

    await database.batch([
      database.insert(users).values({
        id: userId,
        authUserId: principal.subject,
        displayName,
        onboardingStatus: "pending",
      }),
      database.insert(workspaces).values({
        id: workspaceId,
        ownerUserId: userId,
        name: `${displayName} Studio`,
        slug,
        plan: "free",
      }),
      database.insert(workspaceMembers).values({
        workspaceId,
        userId,
        role: "owner",
      }),
      database.insert(creatorProfiles).values({
        id: creatorProfileId,
        workspaceId,
        userId,
        stageName: displayName,
        onboardingStatus: "pending",
      }),
      database.insert(creditAccounts).values({
        workspaceId,
        balance: initialCreditBalance,
        reserved: 0,
      }),
      database.insert(creditLedger).values({
        workspaceId,
        kind: "grant",
        balanceDelta: initialCreditBalance,
        reservedDelta: 0,
        idempotencyKey: `signup-grant:${workspaceId}`,
        description: "Initial signup credit grant",
      }),
    ] as const);

    return { userId, workspaceId, creatorProfileId };
  }

  private requireDatabase(): CreonomeDatabase {
    if (!this.database) {
      throw new ServiceUnavailableException("DATABASE_URL is not configured");
    }
    return this.database;
  }
}
