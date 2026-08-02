import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectWorkspace } from "@/src/features/projects/project-workspace";
import { loadProject } from "@/src/features/projects/projects-data";
import { createServerApiClient } from "@/src/lib/api/server-client";

export const metadata: Metadata = { title: "Project" };

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const project = await loadProject(createServerApiClient(), id);
  if (!project) {
    notFound();
  }

  return <ProjectWorkspace project={project} />;
}
