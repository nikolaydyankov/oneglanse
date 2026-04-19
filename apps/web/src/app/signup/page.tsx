import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SignupForm } from "@/components/forms/signup-form";
import { env } from "@/env";

export default function SignupPage() {
	const showGoogle = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
	return (
		<AuthPageShell subtitle="The only open-source platform to track, measure, and improve your brand’s visibility across AI and LLMs">
			<SignupForm showGoogle={showGoogle} />
		</AuthPageShell>
	);
}
