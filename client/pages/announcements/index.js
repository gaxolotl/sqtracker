import React, { useContext } from "react";
import Link from "next/link";
import jwt from "jsonwebtoken";
import moment from "moment";
import SEO from "../../components/SEO";
import Box from "../../components/Box";
import Text from "../../components/Text";
import { withAuthServerSideProps } from "../../utils/withAuth";
import Button from "../../components/Button";
import List from "../../components/List";
import LocaleContext from "../../utils/LocaleContext";

const Announcements = ({
  announcements = [],
  pinnedAnnouncements = [],
  userRole,
}) => {
  const { locale } = useContext(LocaleContext);

  return (
    <>
      <SEO title="Announcements" />
      <Box padding="20px">
        <Text variant="h1">Announcements</Text>
      </Box>
    </>
  );
};

export const getServerSideProps = withAuthServerSideProps(
  async (context) => {
    const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;
    const SQ_JWT_SECRET = process.env.SQ_JWT_SECRET;

    const token = context.req?.cookies?.token || context.token; 
    
    if (!token) {
      return {
        props: { announcements: [], pinnedAnnouncements: [], userRole: "user" },
      };
    }

    let role = "user";
    try {
      const decoded = jwt.verify(token, SQ_JWT_SECRET);
      role = decoded.role || "user";
    } catch (err) {
      console.error("JWT Verification failed:", err.message);
    }

    const fetchHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    try {
      const announcementsRes = await fetch(
        `${SQ_API_URL}/announcements/page/0`,
        {
          headers: fetchHeaders,
        }
      );

      if (
        announcementsRes.status === 403 &&
        (await announcementsRes.text()) === "User is banned"
      ) {
        throw new Error("banned");
      }
      
      const announcements = await announcementsRes.json();

      const pinnedAnnouncementsRes = await fetch(
        `${SQ_API_URL}/announcements/pinned`,
        {
          headers: fetchHeaders,
        }
      );
      const pinnedAnnouncements = await pinnedAnnouncementsRes.json();

      return {
        props: {
          announcements: Array.isArray(announcements) ? announcements : [],
          pinnedAnnouncements: Array.isArray(pinnedAnnouncements) ? pinnedAnnouncements : [],
          userRole: role,
        },
      };
    } catch (e) {
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
          announcements: [], 
          pinnedAnnouncements: [], 
          userRole: role 
        } 
      };
    }
  }
);

export default Announcements;