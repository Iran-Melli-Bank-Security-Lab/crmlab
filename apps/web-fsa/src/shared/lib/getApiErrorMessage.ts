export function getApiErrorMessage(error, fallback = "Something went wrong.") {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error?.data?.message) return error.data.message;
  if (error?.error) return error.error;
  if (error?.message) return error.message;
  return fallback;
}
