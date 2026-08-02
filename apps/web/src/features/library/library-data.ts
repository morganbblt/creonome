import type { Library } from "@creonome/contracts";

type LibrarySource = Pick<{ getLibrary(): Promise<Library> }, "getLibrary">;

export async function loadLibrary(client: LibrarySource): Promise<{
  source: "api" | "unavailable";
  library: Library;
}> {
  try {
    return { source: "api", library: await client.getLibrary() };
  } catch {
    return {
      source: "unavailable",
      library: { items: [], totalByteSize: 0 },
    };
  }
}
