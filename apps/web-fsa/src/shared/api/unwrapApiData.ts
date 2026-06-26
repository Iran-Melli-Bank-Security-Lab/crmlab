export type ApiEnvelope<TData> = {
  success?: boolean;
  data?: TData;
};

export function unwrapApiData<TData>(response: TData | ApiEnvelope<TData>): TData {
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    (response as ApiEnvelope<TData>).data !== undefined
  ) {
    return (response as ApiEnvelope<TData>).data as TData;
  }

  return response as TData;
}
