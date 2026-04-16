import type { LucideIcon } from "lucide-react";

import {
	DASHBOARD_EMPTY_STATE_HEIGHT_CLASS,
	DASHBOARD_EMPTY_STATE_WIDTH_CLASS,
	EmptyStatePanel,
} from "../empty-state.js";

export function DashboardEmptyState({
	icon: Icon,
	title,
	description,
	eyebrow = "Signal builds here",
	className,
}: {
	icon: LucideIcon;
	title: string;
	description: string;
	eyebrow?: string;
	className?: string;
}) {
	return (
		<EmptyStatePanel
			icon={Icon}
			eyebrow={eyebrow}
			title={title}
			description={description}
			className={className}
			contentClassName={`${DASHBOARD_EMPTY_STATE_WIDTH_CLASS} ${DASHBOARD_EMPTY_STATE_HEIGHT_CLASS} px-4 py-5 sm:px-5 sm:py-5.5 xl:px-6 xl:py-6`}
		/>
	);
}
