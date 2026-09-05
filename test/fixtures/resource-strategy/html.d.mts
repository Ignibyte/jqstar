export type ProjectId = "A" | "B" | "C";
export type Consumer = "summary" | "activity";
export interface Project {
  id: ProjectId;
  name: string;
  version: number;
  activity: string[];
}
export function escapeHtml(value: unknown): string;
export function panelContent(consumer: Consumer, project: Project): string;
export function inspectorDocument(
  session: string,
  strategy: string,
  project: Project,
  message?: string,
): string;
