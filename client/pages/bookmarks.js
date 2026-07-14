import React, { useContext } from "react";
import getConfig from "next/config";
import { withAuthServerSideProps } from "../utils/withAuth";
import SEO from "../components/SEO";
import Text from "../components/Text";
import TorrentList from "../components/TorrentList";
import LocaleContext from "../utils/LocaleContext";
import { NotificationContext } from "../components/Notifications";

const Bookmarks = ({ results }) => {
  const { addNotification } = useContext(NotificationContext);

  const {
    publicRuntimeConfig: { SQ_TORRENT_CATEGORIES },
  } = getConfig();

  const { getLocaleString } = useContext(LocaleContext);
  const torrents = results?.torrents ?? [];

  return (
    <>
      <SEO title={getLocaleString("bmYourBM")} />
      <Text as="h1" mb={5}>
        {getLocaleString("bmYourBM")}
      </Text>
      {torrents.length ? (
        <TorrentList
          torrents={torrents}
          categories={SQ_TORRENT_CATEGORIES}
          total={results?.total ?? 0}
        />
      ) : (
        <Text color="grey">{getLocaleString("bmYouNotHaveAnyBM")}</Text>
      )}
    </>
  );
};

export const getServerSideProps = withAuthServerSideProps(
  async ({ token, fetchHeaders }) => {
    if (!token) return { props: { results: { torrents: [] } } };

    const {
      publicRuntimeConfig: { SQ_API_URL },
    } = getConfig();

    try {
      const bookmarksRes = await fetch(`${SQ_API_URL}/account/bookmarks`, {
        headers: fetchHeaders,
      });
      if (
        bookmarksRes.status === 403 &&
        (await bookmarksRes.text()) === "User is banned"
      ) {
        throw "banned";
      }

      if (!bookmarksRes.ok) {
        addNotification(
        "error",
        `${getLocaleString("bookmarksFetchFailed")}: ${bookmarksRes.status}`
        );
        return { props: { results: { torrents: [] } } };
      }

      const results = await bookmarksRes.json();

      return {
        props: {
          results: {
            torrents: Array.isArray(results?.torrents) ? results.torrents : [],
            total: results?.total ?? 0,
          },
        },
      };
    } catch (e) {
      if (e === "banned") throw "banned";
      return { props: { results: { torrents: [] } } };
    }
  }
);

export default Bookmarks;