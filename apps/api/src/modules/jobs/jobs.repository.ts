export type JobRecord = {
  id: string;
  kind: string;
  provider: string;
  model: string;
  status: string;
  progress: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

export interface JobsRepository {
  findById(workspaceId: string, jobId: string): Promise<JobRecord | null>;
  cancel(workspaceId: string, jobId: string): Promise<JobRecord | null>;
  retry(workspaceId: string, jobId: string): Promise<JobRecord | null>;
}

export const JOBS_REPOSITORY = Symbol("JOBS_REPOSITORY");
