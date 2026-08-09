export type SubmissionState = Readonly<{
  status: "idle" | "success" | "error";
  message: string;
  errors?: Readonly<Record<string, readonly string[] | undefined>>;
}>;

export const INITIAL_SUBMISSION_STATE: SubmissionState = { status: "idle", message: "" };
