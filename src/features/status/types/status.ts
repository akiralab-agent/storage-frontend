export type StatusResponse = {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  message?: string;
};
