"use client";

import { authClient } from "./auth-client";

/**
 * Sign out and leave the protected app shell with a full document redirect.
 * This avoids client-router races while auth cookies/session state are clearing.
 */
export async function signOutAndRedirect(redirectTo = "/login") {
	await authClient.signOut();

	if (typeof window !== "undefined") {
		window.location.replace(redirectTo);
	}
}
