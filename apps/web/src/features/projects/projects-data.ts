import type {
  ProjectDetail,
  ProjectList,
  ProjectSummary,
} from "@creonome/contracts";

type ProjectsSource = Pick<
  { getProjects(): Promise<ProjectList> },
  "getProjects"
>;

type ProjectSource = Pick<
  { getProject(projectId: string): Promise<ProjectDetail> },
  "getProject"
>;

export async function loadProjects(client: ProjectsSource): Promise<{
  source: "api" | "unavailable";
  projects: ProjectSummary[];
}> {
  try {
    const response = await client.getProjects();
    return { source: "api", projects: response.projects };
  } catch {
    return { source: "unavailable", projects: [] };
  }
}

export async function loadProject(
  client: ProjectSource,
  projectId: string,
): Promise<ProjectDetail | null> {
  try {
    return await client.getProject(projectId);
  } catch {
    return null;
  }
}
