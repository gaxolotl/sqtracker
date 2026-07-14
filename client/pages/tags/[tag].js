import React, { useState, useContext } from "react";
import { useRouter } from "next/router";
import qs from "qs";
import { withAuthServerSideProps } from "../../utils/withAuth";
import SEO from "../../components/SEO";
import Text from "../../components/Text";
import LocaleContext from "../../utils/LocaleContext";
import TorrentList from "../../components/TorrentList";

const Tag = ({ results, token }) => {
  const [torrents, setTorrents] = useState(results?.torrents ?? []);

  const router = useRouter();
  const SQ_TORRENT_CATEGORIES = process.env.NEXT_PUBLIC_SQ_TORRENT_CATEGORIES;
const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;

  const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;

    const params = {
      tag: encodeURIComponent(tag),
    };
    const page = pageParam ? parseInt(pageParam) : 0;
    if (page > 0) params.page = page;

    try {
      const searchRes = await fetch(
        `${SQ_API_URL}/torrent/search?${qs.stringify(params)}`,
        {
          headers: fetchHeaders,
        }
      );
      if (
        searchRes.status === 403 &&
        (await searchRes.text()) === "User is banned"
      ) {
        throw "banned";
      }
      const results = await searchRes.json();
      return { props: { results, token } };
    } catch (e) {
      if (e === "banned") throw "banned";
      return { props: {} };
    }
  },
  true
);

export default Tag;
