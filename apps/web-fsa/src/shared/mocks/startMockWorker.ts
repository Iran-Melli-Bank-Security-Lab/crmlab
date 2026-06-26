export async function startMockWorker() {
  if (import.meta.env.VITE_ENABLE_MSW !== "true") return;
  const { worker } = await import("@/shared/mocks/browser");
  await worker.start({ onUnhandledRequest: "bypass" });
}
