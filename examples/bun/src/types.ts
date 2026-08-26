import type { JSX } from "preact";

export type AuthMode = "login" | "register";
export type StatusKind = "error" | "success";
export type IconName = "arrow" | "check" | "eye" | "lock" | "spark" | "wave";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
};

export type Status = {
  kind: StatusKind;
  message: string;
};

export type ApiError = {
  error?: string;
};

export type AuthResponse = {
  user: PublicUser;
};

export type FormSubmitEvent = JSX.TargetedEvent<HTMLFormElement, SubmitEvent>;
