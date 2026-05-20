import JobsPageClient from "./jobs-page-client";

export default async function JobsPage({
	searchParams,
}: {
	searchParams?: Promise<{ workspace?: string }>;
}) {
	const params = await searchParams;
	return <JobsPageClient workspaceId={params?.workspace} />;
}
