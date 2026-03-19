import { type ReactNode } from "react";
import { AuthLayoutClient } from "./AuthLayoutClient";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthLayoutClient>{children}</AuthLayoutClient>;
}
