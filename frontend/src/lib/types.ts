export type AuthenticatedUser = {
  authenticated: true;
  email: string;
  name: string | null;
  role: string | null;
};
