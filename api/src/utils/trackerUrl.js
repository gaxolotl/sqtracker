// The tracker announce endpoints are served by the API service, not the
// Next.js client. When no explicit announce URL is configured, derive the
// tracker origin from the API URL (which usually ends in `/api`) so downloads
// and magnets never point at the client origin.
export const getTrackerBaseUrl = () => {
  if (process.env.SQ_ANNOUNCE_URL) {
    return process.env.SQ_ANNOUNCE_URL.replace(/\/+$/, "");
  }
  if (process.env.SQ_API_URL) {
    return process.env.SQ_API_URL.replace(/\/api\/?$/, "").replace(/\/+$/, "");
  }
  return (process.env.SQ_BASE_URL || "").replace(/\/+$/, "");
};

export const getAnnounceUrl = (uid) => `${getTrackerBaseUrl()}/announce/${uid}`;
