const readLimit = (key, fallback) => {
  const value = Number(process.env[key]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

export const getContentLimits = () => ({
  torrentName: readLimit("SQ_TORRENT_NAME_MAX_LENGTH", 500),
  title: readLimit("SQ_CONTENT_TITLE_MAX_LENGTH", 200),
  body: readLimit("SQ_CONTENT_BODY_MAX_LENGTH", 50000),
  comment: readLimit("SQ_COMMENT_MAX_LENGTH", 10000),
  message: readLimit("SQ_MESSAGE_MAX_LENGTH", 50000),
  profileBio: readLimit("SQ_PROFILE_BIO_MAX_LENGTH", 500),
  profileLocation: readLimit("SQ_PROFILE_LOCATION_MAX_LENGTH", 80),
  mediaInfo: readLimit("SQ_MEDIA_INFO_MAX_LENGTH", 100000),
  torrentTags: readLimit("SQ_TORRENT_TAGS_MAX_LENGTH", 500),
  torrentFileSizeKb: readLimit("SQ_TORRENT_FILE_MAX_SIZE_KB", 1024),
});

export const validateContentText = (
  value,
  label,
  maxLength,
  res,
  { required = true, trim = true } = {},
) => {
  if (!required && (value === undefined || value === null)) return "";
  if (typeof value !== "string") {
    res.status(400).send(`${label} must be text`);
    return null;
  }
  if (required && !value.trim()) {
    res.status(400).send(`${label} is required`);
    return null;
  }
  if (value.length > maxLength) {
    res.status(400).send(`${label} cannot exceed ${maxLength} characters`);
    return null;
  }
  return trim ? value.trim() : value;
};
