
const Sitemap = () => {};

export const getServerSideProps = async ({ req, res }) => {
  const SQ_BASE_URL = process.env.NEXT_PUBLIC_SQ_BASE_URL;
const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;
const SQ_ALLOW_UNREGISTERED_VIEW = process.env.NEXT_PUBLIC_SQ_ALLOW_UNREGISTERED_VIEW;
const SQ_SERVER_SECRET = process.env.SQ_SERVER_SECRET;

  const urls = [SQ_BASE_URL, `${SQ_BASE_URL}/login`, `${SQ_BASE_URL}/register`];

  if (SQ_ALLOW_UNREGISTERED_VIEW) {
    try {
      const listRes = await fetch(`${SQ_API_URL}/torrent/all`, {
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For":
            req.headers["x-forwarded-for"] ?? req.socket.remoteAddress,
          "X-Sq-Server-Secret": SQ_SERVER_SECRET,
          "X-Sq-Public-Access": true,
        },
      });
      const torrents = await listRes.json();
      for (const { infoHash } of torrents) {
        urls.push(`${SQ_BASE_URL}/torrent/${infoHash}`);
      }
    } catch (e) {
      console.error(`[sq] could not list torrents: ${e}`);
    }
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls
      .map(
        (url) => `<url>
        <loc>${url}</loc>
    </url>`
      )
      .join("\n")}
</urlset>
`;

  res.setHeader("Content-Type", "text/xml");
  res.write(sitemap);
  res.end();

  return { props: {} };
};

export default Sitemap;
