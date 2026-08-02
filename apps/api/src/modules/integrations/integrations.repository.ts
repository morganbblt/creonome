import type { SocialProvider } from "@creonome/contracts";

export type IntegrationRecord = {
  id: string;
  provider: SocialProvider;
  displayName: string;
  scopes: string[];
  status: "connected" | "expired" | "revoked" | "error";
  expiresAt: Date | null;
  lastSyncAt: Date | null;
};

export interface IntegrationsRepository {
  list(workspaceId: string): Promise<IntegrationRecord[]>;
  disconnect(workspaceId: string, connectionId: string): Promise<boolean>;
}

export const INTEGRATIONS_REPOSITORY = Symbol("INTEGRATIONS_REPOSITORY");
