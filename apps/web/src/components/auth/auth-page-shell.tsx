import type { ReactNode } from "react";

type AuthPageShellProps = {
	children: ReactNode;
	subtitle?: string;
};

export function AuthPageShell({
	children,
	subtitle,
}: AuthPageShellProps): React.JSX.Element {
	return (
		<div className="flex min-h-svh min-w-0 items-center justify-center overflow-hidden bg-stone-50 px-4 py-6 dark:bg-neutral-950 sm:px-6 sm:py-8 md:px-8">
			<div className="flex w-full min-w-0 max-w-md flex-col gap-6 sm:gap-8 xl:max-w-lg xl:gap-9">
				<div className="space-y-2 text-center sm:space-y-1 xl:space-y-1.5">
					<div className="text-[1.4rem] font-semibold tracking-[-0.05em] text-gray-950 sm:text-[2.1rem] dark:text-gray-50 xl:text-[2.4rem]">
						OneGlanse
					</div>
					{subtitle ? (
						<div className="flex justify-center">
							<p className="text-center text-[0.9rem] text-gray-600 dark:text-gray-300 xl:text-[1rem]">
								{subtitle}
							</p>
						</div>
					) : null}
				</div>
				{children}
			</div>
		</div>
	);
}
