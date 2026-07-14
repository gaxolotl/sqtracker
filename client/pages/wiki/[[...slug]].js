import React, { useState, useContext, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import jwt from "jsonwebtoken";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import moment from "moment";
import SEO from "../../components/SEO";
import Box from "../../components/Box";
import Text from "../../components/Text";
import Button from "../../components/Button";
import MarkdownBody from "../../components/MarkdownBody";
import { withAuthServerSideProps } from "../../utils/withAuth";
import { NotificationContext } from "../../components/Notifications";
import LoadingContext from "../../utils/LoadingContext";
import Modal from "../../components/Modal";
import { WikiFields } from "./new";
import LocaleContext from "../../utils/LocaleContext";

const sortSlug = (a, b) => {
  if (a.slug > b.slug) return 1;
  if (a.slug < b.slug) return -1;
  return 0;
};

const Wiki = ({ page, allPages, token, userRole, slug }) => {
  const [editing, setEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const SQ_SITE_NAME = process.env.NEXT_PUBLIC_SQ_SITE_NAME;
const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;

  useEffect(() => {
    setEditing(false);
  }, [router.asPath]);

  const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;
const SQ_JWT_SECRET = process.env.SQ_JWT_SECRET;

    const { role } = token ? jwt.verify(token, SQ_JWT_SECRET) : { role: null };

    try {
      const wikiRes = await fetch(`${SQ_API_URL}/wiki/${parsedSlug}`, {
        headers: fetchHeaders,
      });
      if (
        wikiRes.status === 403 &&
        (await wikiRes.text()) === "User is banned"
      ) {
        throw "banned";
      }
      const { page, allPages } = await wikiRes.json();
      return {
        props: { page, allPages, token, userRole: role, slug: parsedSlug },
      };
    } catch (e) {
      if (e === "banned") throw "banned";
      return { props: { token, userRole: role, slug: parsedSlug } };
    }
  },
  true
);

export default Wiki;
