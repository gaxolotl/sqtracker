import React, { useContext, useEffect } from "react";
import { withAuthServerSideProps } from "../utils/withAuth";
import SEO from "../components/SEO";
import Text from "../components/Text";
import TorrentList from "../components/TorrentList";
import LocaleContext from "../utils/LocaleContext";
import { NotificationContext } from "../components/Notifications";

const Bookmarks = ({ results, error, statusCode }) => {
  const { getLocaleString } = useContext(LocaleContext);
  const { addNotification } = useContext(NotificationContext);

  // Trigger the error notification on the client side once the component mounts
  useEffect(() => {
    if (error) {
      addNotification(
        "error",
        `${getLocaleString("bookmarksFetchFailed")}: ${statusCode}`
      );
    }
  }, [error, statusCode, addNotification, getLocaleString]);

  return (
    <>
      <SEO title={getLocaleString("bookmarks") || "Bookmarks"} />
      <main className="container mx-auto px-4 py-8">
        <Text variant="h1" className="mb-6">
          {getLocaleString("bookmarks") || "Bookmarks"}
        </Text>
        
        <TorrentList 
          torrents={results?.torrents || []} 
          total={results?.total || 0} 
        />
      </main>
    </>
  );
};

// Server-side fetching wrapped with your auth handler
export const getServerSideProps = withAuthServerSideProps(
  async (ctx) => {
    // Assuming fetchHeaders is provided by your withAuthServerSideProps context
    const { fetchHeaders } = ctx; 
    const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;

    try {
      const bookmarksRes = await fetch(`${SQ_API_URL}/account/bookmarks`, {
        headers: fetchHeaders,
      });

      if (
        bookmarksRes.status === 403 &&
        (await bookmarksRes.text()) === "User is banned"
      ) {
        throw new Error("banned");
      }

      // If fetch fails, pass error state to the client instead of calling addNotification here
      if (!bookmarksRes.ok) {
        return { 
          props: { 
            results: { torrents: [], total: 0 },
            error: true,
            statusCode: bookmarksRes.status
          } 
        };
      }

      const results = await bookmarksRes.json();

      return {
        props: {
          results: {
            torrents: Array.isArray(results?.torrents) ? results.torrents : [],
            total: results?.total ?? 0,
          },
          error: false,
        },
      };
    } catch (e) {
      if (e.message === "banned" || e === "banned") {
        // Let the auth wrapper handle redirecting/logging out banned users
        throw "banned"; 
      }
      return { 
        props: { 
          results: { torrents: [], total: 0 },
          error: true,
          statusCode: 500
        } 
      };
    }
  }
);

export default Bookmarks;