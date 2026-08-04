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
  /**
   * Set once the job is tied to a project — for "storyboard" and
   * "video_render" jobs this is known immediately; for "script" jobs it is
   * only populated once generation succeeds and the project is created.
   * Lets a polling client know where to fetch the finished deliverable.
   */
  projectId: string | null;
};

/**
 * The full row as seen by an internal (non-user-scoped) queued-job handler:
 * it needs the workspace it belongs to and the context payload the
 * triggering endpoint stashed at creation time to redo the generation work.
 */
export type InternalJobRecord = JobRecord & {
  workspaceId: string;
  projectId: string | null;
  requestedByUserId: string | null;
  idempotencyKey: string;
  input: Record<string, unknown>;
};

export type CreateJobInput = {
  workspaceId: string;
  projectId: string | null;
  requestedByUserId: string | null;
  kind: string;
  provider: string;
  model: string;
  idempotencyKey: string;
  input: Record<string, unknown>;
};

export type FailedJobStatus = "failed_retryable" | "failed_final";

export interface JobsRepository {
  findById(workspaceId: string, jobId: string): Promise<JobRecord | null>;
  cancel(workspaceId: string, jobId: string): Promise<JobRecord | null>;
  retry(workspaceId: string, jobId: string): Promise<JobRecord | null>;

  /** Inserts a new job row in the "queued" status, before the Cloud Tasks task exists. */
  create(input: CreateJobInput): Promise<InternalJobRecord>;
  /** Workspace-unscoped lookup used by the internal queued-job handler endpoints. */
  findByIdUnscoped(jobId: string): Promise<InternalJobRecord | null>;
  /** Transitions a queued job to running; returns null if it was not queued. */
  markRunning(jobId: string): Promise<InternalJobRecord | null>;
  markSucceeded(
    jobId: string,
    output: Record<string, unknown>,
  ): Promise<InternalJobRecord | null>;
  markFailed(
    jobId: string,
    status: FailedJobStatus,
    errorCode: string,
    errorMessage: string,
  ): Promise<InternalJobRecord | null>;
}

export const JOBS_REPOSITORY = Symbol("JOBS_REPOSITORY");
