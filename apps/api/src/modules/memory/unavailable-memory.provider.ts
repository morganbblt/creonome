import { ServiceUnavailableException } from "@nestjs/common";
import type {
  MemoryProvider,
  MemoryResult,
  MemorySearchInput,
  RememberInput,
  RememberResult,
} from "./memory-provider.js";

export class UnavailableMemoryProvider implements MemoryProvider {
  search(_input: MemorySearchInput): Promise<MemoryResult[]> {
    throw new ServiceUnavailableException("MEM0_API_KEY is not configured");
  }

  remember(_input: RememberInput): Promise<RememberResult> {
    throw new ServiceUnavailableException("MEM0_API_KEY is not configured");
  }

  forget(_memoryId: string): Promise<void> {
    throw new ServiceUnavailableException("MEM0_API_KEY is not configured");
  }
}
