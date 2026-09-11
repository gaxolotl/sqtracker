const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const fuzzyScore = (haystack, needle) => {
  const text = normalize(haystack);
  const query = normalize(needle);
  if (!query) return 0;
  if (text.includes(query)) return 100 - text.indexOf(query);

  const tokens = query.split(" ").filter(Boolean);
  const words = text.split(" ").filter(Boolean);
  const matchedTokens = tokens.filter((token) =>
    words.some((word) => word.startsWith(token)),
  ).length;
  if (matchedTokens === tokens.length) return 50 + matchedTokens;

  let cursor = 0;
  for (const character of query.replaceAll(" ", "")) {
    cursor = text.indexOf(character, cursor);
    if (cursor === -1) return 0;
    cursor += 1;
  }
  return 20;
};
