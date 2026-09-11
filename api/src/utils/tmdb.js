import https from "node:https";

const TMDB_HOST = "api.themoviedb.org";
const TMDB_LANGUAGE = "en-US";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const CACHE_LIMIT = 100;
const SEARCH_CACHE_MS = 10 * 60 * 1000;
const DETAILS_CACHE_MS = 60 * 60 * 1000;
const cache = new Map();

const technicalMarker =
  /\b(?:4320p|2160p|1080[pi]|720p|576p|480p|4k|8k|uhd|bluray|blu-ray|b[dr]rip|remux|web[ .-]?dl|webrip|webcap|hdtv|dvdrip|dvd|camrip|cam|telesync|x26[45]|h[ .-]?26[45]|hevc|avc|av1|xvid|10bit|hdr10(?:\+)?|hdr|dolby[ .-]?vision|truehd|atmos|dts(?:-hd)?|eac3|ddp(?:5)?|ac3|aac|flac|proper|repack|extended|internal|limited|multi|dubbed|subbed)\b/i;

export class TmdbError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = "TmdbError";
    this.status = status;
  }
}

const setCached = (key, value, ttl) => {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(key, { expires: Date.now() + ttl, value });
  return value;
};

const getCached = (key) => {
  const item = cache.get(key);
  if (!item) return undefined;
  if (item.expires <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return item.value;
};

const tmdbToken = () => process.env.SQ_TMDB_READ_TOKEN?.trim();
const tmdbApiKey = () => process.env.SQ_TMDB_API_KEY?.trim();

export const isTmdbConfigured = () => Boolean(tmdbToken() || tmdbApiKey());

const requestJson = (pathname, searchParams) => {
  const token = tmdbToken();
  const apiKey = tmdbApiKey();
  if (!token && !apiKey) {
    throw new TmdbError("TMDB metadata matching is not configured.", 503);
  }

  const params = new URLSearchParams(searchParams);
  if (apiKey) params.set("api_key", apiKey);
  const path = `${pathname}?${params.toString()}`;
  return new Promise((resolve, reject) => {
    const request = https.get(
      {
        hostname: TMDB_HOST,
        path,
        headers: {
          Accept: "application/json",
          ...(apiKey ? {} : { Authorization: `Bearer ${token}` }),
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (response) => {
        let size = 0;
        const chunks = [];

        response.on("data", (chunk) => {
          size += chunk.length;
          if (size > MAX_RESPONSE_BYTES) {
            request.destroy(
              new TmdbError("TMDB returned an unexpectedly large response."),
            );
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(
              new TmdbError(
                response.statusCode === 401
                  ? "TMDB authentication failed."
                  : "TMDB could not complete the metadata request.",
                response.statusCode === 401 ? 503 : 502,
              ),
            );
            return;
          }
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch {
            reject(new TmdbError("TMDB returned an invalid response."));
          }
        });
      },
    );

    request.on("timeout", () => {
      request.destroy(new TmdbError("TMDB metadata request timed out."));
    });
    request.on("error", (error) => {
      reject(
        error instanceof TmdbError
          ? error
          : new TmdbError("TMDB metadata request failed."),
      );
    });
  });
};

export const normalizeTitle = (value) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

const guessMediaType = (category, season) => {
  const normalizedCategory = normalizeTitle(category);
  if (/\b(?:tv|television|series|shows?)\b/.test(normalizedCategory)) {
    return "tv";
  }
  if (/\b(?:movie|movies|film|films|cinema)\b/.test(normalizedCategory)) {
    return "movie";
  }
  return season !== undefined ? "tv" : undefined;
};

export const parseReleaseName = (value, category = "") => {
  const releaseName = String(value ?? "")
    .trim()
    .replace(/\.torrent$/i, "")
    .replace(/\.(?:mkv|mp4|avi|mov|m4v|wmv|ts)$/i, "");
  const normalized = releaseName
    .replace(/^\[[^\]]{1,40}\]\s*/, "")
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const seasonEpisodeMatch = normalized.match(
    /\bS(\d{1,2})(?:\s*E\d{1,3}(?:\s*[- ]?\s*E\d{1,3})*)?/i,
  );
  const alternateEpisodeMatch = normalized.match(/\b(\d{1,2})x(\d{1,3})\b/i);
  const naturalEpisodeMatch = normalized.match(
    /\bseason\s*(\d{1,2})(?:\s*(?:episode|ep)(?:\s*(\d{1,3}))?)?/i,
  );
  const episodeMatch =
    seasonEpisodeMatch ?? alternateEpisodeMatch ?? naturalEpisodeMatch;
  const season = seasonEpisodeMatch
    ? Number(seasonEpisodeMatch[1])
    : alternateEpisodeMatch
      ? Number(alternateEpisodeMatch[1])
      : naturalEpisodeMatch
        ? Number(naturalEpisodeMatch[1])
        : undefined;
  const episodes = seasonEpisodeMatch
    ? [...seasonEpisodeMatch[0].matchAll(/E(\d{1,3})/gi)].map((match) =>
        Number(match[1]),
      )
    : alternateEpisodeMatch
      ? [Number(alternateEpisodeMatch[2])]
      : naturalEpisodeMatch?.[2]
        ? [Number(naturalEpisodeMatch[2])]
        : [];

  const markerMatch = technicalMarker.exec(normalized);
  const episodeIndex = episodeMatch?.index;
  const yearMatches = [...normalized.matchAll(/\b(19\d{2}|20\d{2})\b/g)].filter(
    (match) =>
      match.index > 0 && Number(match[1]) <= new Date().getFullYear() + 1,
  );
  const yearMatch =
    episodeIndex === undefined
      ? yearMatches.at(-1)
      : yearMatches.filter((match) => match.index < episodeIndex).at(-1);
  const episodeEnd = episodeMatch
    ? episodeMatch.index + episodeMatch[0].length
    : undefined;
  const episodeTitleEnd =
    episodeEnd === undefined
      ? undefined
      : [markerMatch?.index, ...yearMatches.map((match) => match.index)]
          .filter((index) => Number.isInteger(index) && index > episodeEnd)
          .sort((left, right) => left - right)[0];
  const episodeTitle =
    episodeEnd === undefined || episodes.length !== 1
      ? undefined
      : normalized
          .slice(episodeEnd, episodeTitleEnd)
          .replace(/\s+-\s*[A-Za-z0-9]{2,20}$/i, "")
          .replace(/[\s([\]{\-]+$/g, "")
          .trim() || undefined;
  const cutoffs = [markerMatch?.index, episodeIndex, yearMatch?.index].filter(
    (index) => Number.isInteger(index) && index > 0,
  );
  let title = normalized.slice(
    0,
    cutoffs.length ? Math.min(...cutoffs) : undefined,
  );
  title = title
    .replace(/\s+-\s*[A-Za-z0-9]{2,20}$/i, "")
    .replace(/[\s([{\-]+$/g, "")
    .trim();

  if (!title) title = normalized;

  return {
    releaseName,
    title,
    query: title,
    year: yearMatch ? Number(yearMatch[1]) : undefined,
    season,
    episodes: [...new Set(episodes)],
    ...(episodeTitle ? { episodeTitle } : {}),
    mediaType: guessMediaType(category, season),
  };
};

const editDistance = (left, right) => {
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
};

const titleSimilarity = (left, right) => {
  const normalizedLeft = normalizeTitle(left);
  const normalizedRight = normalizeTitle(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;

  const distanceSimilarity =
    1 -
    editDistance(normalizedLeft, normalizedRight) /
      Math.max(normalizedLeft.length, normalizedRight.length);
  const leftTokens = new Set(normalizedLeft.split(" "));
  const rightTokens = new Set(normalizedRight.split(" "));
  const intersection = [...leftTokens].filter((token) =>
    rightTokens.has(token),
  ).length;
  const tokenSimilarity =
    (2 * intersection) / (leftTokens.size + rightTokens.size);
  return Math.max(distanceSimilarity, tokenSimilarity);
};

const resultToCandidate = (result, fallbackMediaType) => {
  const mediaType = result.media_type ?? fallbackMediaType;
  const date = result.release_date ?? result.first_air_date ?? "";
  return {
    id: result.id,
    mediaType,
    title: result.title ?? result.name ?? "",
    originalTitle: result.original_title ?? result.original_name ?? "",
    date,
    year: /^\d{4}/.test(date) ? Number(date.slice(0, 4)) : undefined,
    overview: result.overview ?? "",
    posterPath: result.poster_path ?? undefined,
    backdropPath: result.backdrop_path ?? undefined,
    rating: Number(result.vote_average) || 0,
    voteCount: Number(result.vote_count) || 0,
    popularity: Number(result.popularity) || 0,
  };
};

export const scoreTmdbCandidate = (parsed, candidate) => {
  const similarity = Math.max(
    titleSimilarity(parsed.title, candidate.title),
    titleSimilarity(parsed.title, candidate.originalTitle),
  );
  let score = similarity === 1 ? 70 : Math.round(similarity * 60);

  if (parsed.year && candidate.year) {
    const difference = Math.abs(parsed.year - candidate.year);
    if (difference === 0) score += 20;
    else if (difference === 1) score += 8;
    else score -= 25;
  }
  if (parsed.mediaType) {
    score += parsed.mediaType === candidate.mediaType ? 15 : -35;
  }

  return Math.max(0, Math.min(100, score));
};

const getTmdbEpisode = async (tvId, season, episode) => {
  const cacheKey = `episode:${tvId}:${season}:${episode}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const details = await requestJson(
    `/3/tv/${tvId}/season/${season}/episode/${episode}`,
    new URLSearchParams({ language: TMDB_LANGUAGE }),
  );
  return setCached(cacheKey, details, DETAILS_CACHE_MS);
};

const verifyEpisode = async (parsed, candidate) => {
  if (
    candidate.mediaType !== "tv" ||
    parsed.season === undefined ||
    parsed.episodes.length !== 1 ||
    !parsed.episodeTitle
  ) {
    return candidate;
  }

  try {
    const episode = await getTmdbEpisode(
      candidate.id,
      parsed.season,
      parsed.episodes[0],
    );
    const similarity = titleSimilarity(parsed.episodeTitle, episode.name);
    if (similarity < 0.85) return candidate;
    return {
      ...candidate,
      confidence: similarity === 1 ? 100 : Math.max(candidate.confidence, 95),
      episodeTitle: episode.name,
      episodeMatch: true,
    };
  } catch {
    return candidate;
  }
};

export const searchTmdb = async (parsed) => {
  if (!parsed.query || parsed.query.length < 2 || parsed.query.length > 160) {
    throw new TmdbError("Could not extract a searchable release title.", 400);
  }

  const cacheKey = `search:${parsed.mediaType ?? "multi"}:${parsed.year ?? ""}:${parsed.season ?? ""}:${parsed.episodes.join(",")}:${normalizeTitle(parsed.episodeTitle)}:${normalizeTitle(parsed.query)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const endpoint = parsed.mediaType
    ? `/3/search/${parsed.mediaType}`
    : "/3/search/multi";
  const searchParams = new URLSearchParams({
    query: parsed.query,
    include_adult: "false",
    language: TMDB_LANGUAGE,
    page: "1",
  });
  if (parsed.year && parsed.mediaType === "movie") {
    searchParams.set("year", String(parsed.year));
  }
  if (parsed.year && parsed.mediaType === "tv") {
    searchParams.set("first_air_date_year", String(parsed.year));
  }

  const response = await requestJson(endpoint, searchParams);
  const scoredCandidates = (
    Array.isArray(response.results) ? response.results : []
  )
    .filter((result) =>
      parsed.mediaType
        ? true
        : result.media_type === "movie" || result.media_type === "tv",
    )
    .map((result) => resultToCandidate(result, parsed.mediaType))
    .filter(
      (candidate) =>
        Number.isInteger(candidate.id) &&
        (candidate.mediaType === "movie" || candidate.mediaType === "tv") &&
        candidate.title,
    )
    .map((candidate) => ({
      ...candidate,
      confidence: scoreTmdbCandidate(parsed, candidate),
    }))
    .sort(
      (left, right) =>
        right.confidence - left.confidence ||
        right.popularity - left.popularity,
    )
    .slice(0, 5);
  const candidates = (
    await Promise.all(
      scoredCandidates.map((candidate, index) =>
        index < 3 && candidate.confidence >= 70
          ? verifyEpisode(parsed, candidate)
          : candidate,
      ),
    )
  ).sort(
    (left, right) =>
      right.confidence - left.confidence || right.popularity - left.popularity,
  );

  const top = candidates[0];
  const second = candidates[1];
  const autoMatchId =
    top?.confidence >= 85 &&
    (!second || top.confidence - second.confidence >= 5)
      ? top.id
      : undefined;

  return setCached(cacheKey, { candidates, autoMatchId }, SEARCH_CACHE_MS);
};

export const getTmdbMetadata = async (mediaType, id, parsed) => {
  if (
    (mediaType !== "movie" && mediaType !== "tv") ||
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new TmdbError("Invalid TMDB selection.", 400);
  }

  const cacheKey = `details:${mediaType}:${id}`;
  let details = getCached(cacheKey);
  if (!details) {
    details = await requestJson(
      `/3/${mediaType}/${id}`,
      new URLSearchParams({
        append_to_response: "external_ids",
        language: TMDB_LANGUAGE,
      }),
    );
    setCached(cacheKey, details, DETAILS_CACHE_MS);
  }

  const candidate = resultToCandidate(details, mediaType);
  const verifiedCandidate = await verifyEpisode(parsed, {
    ...candidate,
    confidence: scoreTmdbCandidate(parsed, candidate),
  });
  return {
    provider: "tmdb",
    id: candidate.id,
    mediaType,
    imdbId: /^tt\d+$/.test(
      details.external_ids?.imdb_id ?? details.imdb_id ?? "",
    )
      ? (details.external_ids?.imdb_id ?? details.imdb_id)
      : undefined,
    title: candidate.title,
    originalTitle: candidate.originalTitle,
    overview: candidate.overview,
    releaseDate: candidate.date,
    year: candidate.year,
    posterPath: candidate.posterPath,
    backdropPath: candidate.backdropPath,
    genres: Array.isArray(details.genres)
      ? details.genres.map((genre) => genre.name).filter(Boolean)
      : [],
    rating: candidate.rating,
    voteCount: candidate.voteCount,
    runtime:
      Number(details.runtime) ||
      Number(details.episode_run_time?.[0]) ||
      undefined,
    season: parsed.season,
    episodes: parsed.episodes,
    episodeTitle: verifiedCandidate.episodeTitle ?? parsed.episodeTitle,
    confidence: verifiedCandidate.confidence,
  };
};
