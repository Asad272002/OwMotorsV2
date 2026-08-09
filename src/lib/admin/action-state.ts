export type AdminActionState = Readonly<{
  status: "idle" | "success" | "error";
  message: string;
  errors?: Readonly<Record<string, readonly string[] | undefined>>;
  data?: Readonly<Record<string, unknown>>;
}>;

export const INITIAL_ADMIN_ACTION_STATE: AdminActionState = { status: "idle", message: "" };
