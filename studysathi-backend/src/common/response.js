export function successResponse(data) {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}
