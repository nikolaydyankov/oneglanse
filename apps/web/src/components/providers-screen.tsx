import { ProviderConnectionsPanel } from "@/components/provider-connections-panel";

export function ProvidersScreen(props: {
	title?: string | null;
	description?: string | null;
	nextHref?: string | null;
	showSetupNotice?: boolean;
	isSelfHost?: boolean;
}) {
	const {
		title = null,
		description = null,
		nextHref = null,
		showSetupNotice = true,
		isSelfHost = false,
	} = props;

	return (
		<div className="web-centered-page">
			<div className="w-full max-w-5xl">
				<ProviderConnectionsPanel
					title={title}
					description={description}
					nextHref={nextHref}
					showSetupNotice={showSetupNotice}
					isSelfHost={isSelfHost}
				/>
			</div>
		</div>
	);
}
