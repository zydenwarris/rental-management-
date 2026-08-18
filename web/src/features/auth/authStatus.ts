/**
 * Kept out of AuthProvider.tsx on purpose.
 *
 * React Fast Refresh only handles a module whose exports are all components. A plain
 * constant alongside the provider makes every edit invalidate the module and remount the
 * tree, which during development looks exactly like being randomly signed out.
 */
export const AuthStatus = {
  Loading: "loading",
  SignedIn: "signed-in",
  SignedOut: "signed-out",
} as const;

export type AuthStatus = (typeof AuthStatus)[keyof typeof AuthStatus];
