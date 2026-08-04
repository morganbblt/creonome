import { CloudTasksClient } from "@google-cloud/tasks";
import { ServiceUnavailableException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type {
  EnqueueGenerationJobInput,
  GenerationQueue,
} from "./generation-queue.js";

/**
 * Maps a generation_jobs.kind to the internal handler route that knows how
 * to execute it. Mirrors the routing a Cloud Tasks push target needs: one
 * handler per owning feature module, reusing the existing service methods
 * that used to run inline in the public controller action.
 */
const HANDLER_PATH_BY_KIND: Record<string, string> = {
  opportunity_batch: "internal/opportunity-jobs",
  script: "internal/opportunity-jobs",
  storyboard: "internal/project-jobs",
  video_render: "internal/project-jobs",
};

type CloudTasksGenerationQueueConfig = {
  project: string;
  location: string;
  queue: string;
  workerBaseUrl: string;
  internalJobToken: string;
  apiPrefix: string;
};

/**
 * Enqueues generation work onto the provisioned `creonome-generation` Cloud
 * Tasks queue (europe-west1, since Cloud Tasks is unavailable in the API's
 * home region). The created task calls back into this same API's internal
 * handler endpoints, authenticated the same way as every other
 * service-to-service endpoint in this codebase (see InternalJobAuthGuard).
 */
export class CloudTasksGenerationQueue implements GenerationQueue {
  private client: CloudTasksClient | undefined;

  constructor(private readonly config: ConfigService) {}

  async enqueue(input: EnqueueGenerationJobInput): Promise<void> {
    const handlerPath = HANDLER_PATH_BY_KIND[input.kind];
    if (!handlerPath) {
      throw new ServiceUnavailableException(
        `No queued-job handler is registered for generation kind "${input.kind}"`,
      );
    }

    const {
      project,
      location,
      queue,
      workerBaseUrl,
      internalJobToken,
      apiPrefix,
    } = this.requireConfig();

    const client = this.getClient();
    const parent = client.queuePath(project, location, queue);
    const url = `${workerBaseUrl.replace(/\/+$/, "")}/${apiPrefix}/v1/${handlerPath}/${input.jobId}/execute`;

    await client.createTask({
      parent,
      task: {
        httpRequest: {
          httpMethod: "POST",
          url,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${internalJobToken}`,
          },
          body: Buffer.from(JSON.stringify({ jobId: input.jobId })).toString(
            "base64",
          ),
        },
      },
    });
  }

  private requireConfig(): CloudTasksGenerationQueueConfig {
    const project = this.config.get<string>("GOOGLE_CLOUD_PROJECT");
    const location = this.config.get<string>("GCP_TASKS_LOCATION");
    const queue = this.config.get<string>("GCP_TASKS_QUEUE");
    const workerBaseUrl =
      this.config.get<string>("WORKER_BASE_URL") ||
      this.config.get<string>("API_URL");
    const internalJobToken = this.config.get<string>("INTERNAL_JOB_TOKEN");
    const apiPrefix = this.config.get<string>("API_PREFIX") ?? "api";

    const missing = [
      !project && "GOOGLE_CLOUD_PROJECT",
      !location && "GCP_TASKS_LOCATION",
      !queue && "GCP_TASKS_QUEUE",
      !workerBaseUrl && "WORKER_BASE_URL (or API_URL)",
      !internalJobToken && "INTERNAL_JOB_TOKEN",
    ].filter((value): value is string => Boolean(value));

    if (missing.length > 0) {
      throw new ServiceUnavailableException(
        `Cloud Tasks is not configured for this environment; missing: ${missing.join(", ")}. Generation jobs cannot be queued until these are set (see docs/setup/environment.md).`,
      );
    }

    return {
      project: project!,
      location: location!,
      queue: queue!,
      workerBaseUrl: workerBaseUrl!,
      internalJobToken: internalJobToken!,
      apiPrefix,
    };
  }

  private getClient(): CloudTasksClient {
    if (!this.client) {
      this.client = new CloudTasksClient();
    }
    return this.client;
  }
}
