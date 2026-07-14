import React, { useContext } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { withAuthServerSideProps } from "../utils/withAuth";
import Box from "../components/Box";
import Text from "../components/Text";
import SEO from "../components/SEO";
import Input from "../components/Input";
import Button from "../components/Button";
import TorrentList from "../components/TorrentList";
import Infobox from "../components/Infobox";
import { ErrorCircle } from "@styled-icons/boxicons-regular/ErrorCircle";
import { News } from "@styled-icons/boxicons-regular/News";
import moment from "moment/moment";
import LocaleContext from "../utils/LocaleContext";

// Define the PublicLanding component used as a fallback for guest users
const PublicLanding = ({ name, allowRegister }) => {
  return (
    <Box padding="40px" textAlign="center">
      <Text variant="h1">Welcome to {name}</Text>
      {allowRegister === "true" && (
        <Link href="/register" passHref>
          <Button>Register an Account</Button>
        </Link>
      )}
      <Link href="/login" passHref>
        <Button style={{ marginLeft: "10px" }}>Log In</Button>
      </Link>
    </Box>
  );
};

const Index = ({ 
  latestTorrents = [], 
  latestAnnouncement = null, 
  emailVerified, 
  token,
  categories 
}) => {
  const SQ_SITE_NAME = process.env.NEXT_PUBLIC_SQ_SITE_NAME;
  const SQ_ALLOW_REGISTER = process.env.NEXT_PUBLIC_SQ_ALLOW_REGISTER;

  const router = useRouter();

  // If no token, render the landing page for guest visitors
  if (!token) {
    return (
      <>
        <SEO title={SQ_SITE_NAME} />
        <PublicLanding name={SQ_SITE_NAME} allowRegister={SQ_ALLOW_REGISTER} />
      </>
    );
  }

  const handleSearch = (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const query = form.get("query");
    if (query) router.push(`/search/${encodeURIComponent(query)}`);
  };

  return (
    <>
      <SEO title="Home" />
      <Box padding="20px">
        {/* Email verification warning banner if they aren't verified */}
        {!emailVerified && (
          <Infobox icon={<ErrorCircle size="24" />} variant="warning" margin="0 0 20px 0">
            Please verify your email address to unlock all site features.
          </Infobox>
        )}

        {/* Latest Announcement */}
        {latestAnnouncement && (
          <Infobox icon={<News size="24" />} variant="info" margin="0 0 20px 0">
            <Text bold>{latestAnnouncement.title}</Text>
            <Text size="sm">{moment(latestAnnouncement.createdAt).fromNow()}</Text>
            <Text margin="10px 0 0 0">{latestAnnouncement.content}</Text>
          </Infobox>
        )}

        {/* Search Bar */}
        <form onSubmit={handleSearch}>
          <Box display="flex" margin="0 0 20px 0">
            <Input name="query" placeholder="Search torrents..." style={{ marginRight: "10px" }} />
            <Button type="submit">Search</Button>
          </Box>
        </form>

        {/* Torrents Display */}
        <Text variant="h2" margin="0 0 10px 0">Latest Uploads</Text>
        <TorrentList torrents={latestTorrents} categories={categories} />
      </Box>
    </>
  );
};

export const getServerSideProps = withAuthServerSideProps(
  async (context) => {
    const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;
    const SQ_TORRENT_CATEGORIES = process.env.NEXT_PUBLIC_SQ_TORRENT_CATEGORIES;

    // Safely retrieve user token from Next.js server context
    const token = context.req?.cookies?.token || context.token || null;

    if (!token) {
      return {
        props: { token: null },
      };
    }

    const fetchHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    try {
      // 1. Fetch latest torrents
      const latestTorrentsRes = await fetch(`${SQ_API_URL}/torrent/latest`, {
        headers: fetchHeaders,
      });

      if (
        latestTorrentsRes.status === 403 &&
        (await latestTorrentsRes.text()) === "User is banned"
      ) {
        throw new Error("banned");
      }
      const latestTorrents = await latestTorrentsRes.json();

      // 2. Fetch latest announcement
      const latestAnnouncementRes = await fetch(
        `${SQ_API_URL}/announcements/latest`,
        {
          headers: fetchHeaders,
        }
      );
      let latestAnnouncement = null;
      if (latestAnnouncementRes.status === 200) {
        latestAnnouncement = await latestAnnouncementRes.json();
      }

      // 3. Fetch verification status
      const verifiedRes = await fetch(`${SQ_API_URL}/account/get-verified`, {
        headers: fetchHeaders,
      });
      const emailVerified = await verifiedRes.json();

      // Parse environment variables like categories for list rendering
      const categories = SQ_TORRENT_CATEGORIES ? JSON.parse(SQ_TORRENT_CATEGORIES) : [];

      return {
        props: { 
          latestTorrents: Array.isArray(latestTorrents) ? latestTorrents : [], 
          latestAnnouncement, 
          emailVerified, 
          token,
          categories
        },
      };
    } catch (e) {
      console.error(e);
      if (e.message === "banned") {
        return {
          redirect: {
            destination: "/banned",
            permanent: false,
          },
        };
      }
      return { 
        props: { 
          latestTorrents: [], 
          latestAnnouncement: null, 
          emailVerified: false, 
          token 
        } 
      };
    }
  },
  false, // options standardly used in custom auth wrappers
  true
);

export default Index;