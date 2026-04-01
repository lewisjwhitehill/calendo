export type UsageLimitResult = {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  plan: "free" | "pro";
};
