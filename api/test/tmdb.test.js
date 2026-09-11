import assert from "node:assert/strict";
import test from "node:test";
import { parseReleaseName, scoreTmdbCandidate } from "../src/utils/tmdb.js";

test("parses a TV episode release", () => {
  assert.deepEqual(
    parseReleaseName(
      "The.Last.of.Us.S02E04.2160p.WEB-DL.DDP5.1.H.265.mkv",
      "tv",
    ),
    {
      releaseName: "The.Last.of.Us.S02E04.2160p.WEB-DL.DDP5.1.H.265",
      title: "The Last of Us",
      query: "The Last of Us",
      year: undefined,
      season: 2,
      episodes: [4],
      mediaType: "tv",
    },
  );
});

test("parses a movie title and release year", () => {
  assert.deepEqual(
    parseReleaseName("Dune.Part.Two.2024.1080p.BluRay.x264", "movies"),
    {
      releaseName: "Dune.Part.Two.2024.1080p.BluRay.x264",
      title: "Dune Part Two",
      query: "Dune Part Two",
      year: 2024,
      season: undefined,
      episodes: [],
      mediaType: "movie",
    },
  );
});

test("preserves years that are part of a movie title", () => {
  assert.equal(
    parseReleaseName("2001.A.Space.Odyssey.1968.1080p.BluRay", "movies").title,
    "2001 A Space Odyssey",
  );
  assert.deepEqual(parseReleaseName("1917.2019.2160p.UHD.BluRay", "movies"), {
    releaseName: "1917.2019.2160p.UHD.BluRay",
    title: "1917",
    query: "1917",
    year: 2019,
    season: undefined,
    episodes: [],
    mediaType: "movie",
  });
});

test("parses multi-episode and alternate episode notation", () => {
  const multiEpisode = parseReleaseName("Show.Name.S03E01-E03.720p.HDTV");
  assert.equal(multiEpisode.title, "Show Name");
  assert.equal(multiEpisode.season, 3);
  assert.deepEqual(multiEpisode.episodes, [1, 3]);
  assert.equal(multiEpisode.mediaType, "tv");

  const alternate = parseReleaseName("Another.Show.2x07.WEBRip");
  assert.equal(alternate.title, "Another Show");
  assert.equal(alternate.season, 2);
  assert.deepEqual(alternate.episodes, [7]);
});

test("parses natural TV season and episode searches", () => {
  const parsed = parseReleaseName("The Rookie season 6 episode 3");

  assert.equal(parsed.title, "The Rookie");
  assert.equal(parsed.query, "The Rookie");
  assert.equal(parsed.season, 6);
  assert.deepEqual(parsed.episodes, [3]);
  assert.equal(parsed.mediaType, "tv");
});

test("extracts a single episode title for TMDB verification", () => {
  const parsed = parseReleaseName(
    "The.Rookie.S06E03.Trouble.in.Paradise.1080p.AMZN.WEB-DL.DDP5.1.H.264-FLUX[TGx]",
    "tv",
  );

  assert.equal(parsed.title, "The Rookie");
  assert.equal(parsed.season, 6);
  assert.deepEqual(parsed.episodes, [3]);
  assert.equal(parsed.episodeTitle, "Trouble in Paradise");
});

test("scores title, year, and media type without trusting popularity", () => {
  const parsed = parseReleaseName(
    "Dune.Part.Two.2024.1080p.BluRay.x264",
    "movies",
  );
  const exact = {
    title: "Dune: Part Two",
    originalTitle: "Dune: Part Two",
    year: 2024,
    mediaType: "movie",
  };

  assert.equal(scoreTmdbCandidate(parsed, exact), 100);
  assert.equal(scoreTmdbCandidate(parsed, { ...exact, mediaType: "tv" }), 55);
  assert.equal(scoreTmdbCandidate(parsed, { ...exact, year: 1984 }), 60);
});
