import { reportError } from "@/lib/error-monitoring";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("unhandledRejection", (reason) => {
      reportError(reason, { scope: "process.unhandledRejection" });
    });

    process.on("uncaughtException", (error) => {
      reportError(error, { scope: "process.uncaughtException" });
    });
  }
}
