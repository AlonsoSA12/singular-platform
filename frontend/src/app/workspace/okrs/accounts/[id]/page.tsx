import { redirect } from "next/navigation";

type WorkspaceOkrsAccountDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function WorkspaceOkrsAccountDetailPage({
  params
}: WorkspaceOkrsAccountDetailPageProps) {
  await params;
  redirect("/workspace/portfolio-analysis");
}
