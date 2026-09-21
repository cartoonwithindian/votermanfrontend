import { type UserRole, type MockCredentials, type AuthState } from "./auth-types";

const MOCK_CREDENTIALS: MockCredentials[] = [
  {
    email: "student123@gmail.com",
    password: "student",
    role: "student",
    name: "Anurag Gupta",
  },
  {
    email: "student123@gmail.com",
    password: "student",
    role: "candidate",
    name: "Priya Sharma",
  },
  {
    email: "student123@gmail.com",
    password: "student",
    role: "administrator",
    name: "Election Admin",
  },
];

let currentAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
};

let failedAttempts = new Map<string, number>();
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 300000;

export function getDashboardRoute(role: UserRole): string {
  switch (role) {
    case "student":
      return "/student/dashboard";
    case "candidate":
      return "/student/dashboard";
    case "administrator":
      return "/admin/dashboard";
    case "cad":
      return "/cad/dashboard";
  }
}

export function setAuthCookie(role: UserRole, name: string, email: string) {
  if (typeof document !== "undefined") {
    const data = JSON.stringify({ role, name, email });
    document.cookie = `campusvote_auth=${encodeURIComponent(data)}; path=/; max-age=86400; SameSite=Lax`;
  }
}

export function clearAuthCookie() {
  if (typeof document !== "undefined") {
    document.cookie = "campusvote_auth=; path=/; max-age=0";
  }
}

export function getAuthCookie(): { role: string; name: string; email: string } | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/campusvote_auth=([^;]+)/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function validateEmail(email: string, role: UserRole): string | null {
  if (!email.trim()) {
    switch (role) {
      case "student":
        return "Email or Student ID is required.";
      case "candidate":
        return "Candidate ID or College Email is required.";
      case "administrator":
        return "Admin Email is required.";
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Enter a valid college email address.";
  }

  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return "Password is required.";
  }
  return null;
}

export function isAccountLocked(email: string): boolean {
  const attempts = failedAttempts.get(email.toLowerCase()) || 0;
  if (attempts >= MAX_ATTEMPTS) {
    return true;
  }
  return false;
}

export function authenticate(
  email: string,
  password: string,
  role: UserRole
): {
  success: boolean;
  error?: string;
  locked?: boolean;
  user?: AuthState["user"];
} {
  const normalizedEmail = email.toLowerCase().trim();

  if (isAccountLocked(normalizedEmail)) {
    return { success: false, locked: true };
  }

  const credential = MOCK_CREDENTIALS.find(
    (c) => c.email.toLowerCase() === normalizedEmail && c.role === role
  );

  if (!credential || credential.password !== password) {
    const attempts = (failedAttempts.get(normalizedEmail) || 0) + 1;
    failedAttempts.set(normalizedEmail, attempts);

    if (attempts >= MAX_ATTEMPTS) {
      return { success: false, locked: true };
    }

    return {
      success: false,
      error: "Invalid credentials. Please check your details and try again.",
    };
  }

  failedAttempts.delete(normalizedEmail);

  const user = {
    email: credential.email,
    role: credential.role,
    name: credential.name,
  };

  currentAuthState = {
    isAuthenticated: true,
    user,
  };

  return { success: true, user };
}

export function getCurrentAuth(): AuthState {
  return currentAuthState;
}

export function logout(): void {
  currentAuthState = {
    isAuthenticated: false,
    user: null,
  };
}

export function resetPasswordRequest(_email: string): void {
  return;
}

export function resetPassword(
  _newPassword: string
): { success: boolean; error?: string } {
  return { success: true };
}

export function getRoleDescription(role: UserRole): string {
  switch (role) {
    case "student":
      return "Vote and view election information.";
    case "candidate":
      return "Manage your candidate profile and election information.";
    case "administrator":
      return "Manage the election platform.";
    case "cad":
      return "Monitor the election in real time.";
  }
}