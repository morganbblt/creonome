import { ServiceUnavailableException } from "@nestjs/common";
import type {
  StoredVideoObject,
  VideoObjectRead,
  VideoObjectStore,
} from "./video-object-store.js";

export class UnavailableVideoObjectStore implements VideoObjectStore {
  async put(): Promise<StoredVideoObject> {
    throw new ServiceUnavailableException(
      "Private video storage is unavailable",
    );
  }

  async read(): Promise<VideoObjectRead> {
    throw new ServiceUnavailableException(
      "Private video storage is unavailable",
    );
  }
}
