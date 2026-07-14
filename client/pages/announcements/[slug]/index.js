import React, { useState, useContext, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import moment from "moment";
import jwt from "jsonwebtoken";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCookies } from "react-cookie";
import { Pin } from "@styled-icons/boxicons-regular";
import SEO from "../../../components/SEO";
import Box from "../../../components/Box";
import Text from "../../../components/Text";
import Button from "../../../components/Button";
import MarkdownBody from "../../../components/MarkdownBody";
import { withAuthServerSideProps } from "../../../utils/withAuth";
import { NotificationContext } from "../../../components/Notifications";
import Input from "../../../components/Input";
import Comment from "../../../components/Comment";
import LoadingContext from "../../../utils/LoadingContext";
import Modal from "../../../components/Modal";
import LocaleContext from "../../../utils/LocaleContext";

const Announcement = ({ announcement, token, userRole }) => {
  const [pinned, setPinned] = useState(announcement.pinned);
  const [comments, setComments] = useState(announcement.comments);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;

  const router = useRouter();

  const [cookies] = useCookies();

  const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;
const SQ_JWT_SECRET = process.env.SQ_JWT_SECRET;

    const { role } = jwt.verify(token, SQ_JWT_SECRET);

    try {
      const announcementRes = await fetch(
        `${SQ_API_URL}/announcements/${slug}`,
        {
          headers: fetchHeaders,
        }
      );
      if (
        announcementRes.status === 403 &&
        (await announcementRes.text()) === "User is banned"
      ) {
        throw "banned";
      }
      const announcement = await announcementRes.json();
      return { props: { announcement, token, userRole: role } };
    } catch (e) {
      if (e === "banned") throw "banned";
      return { props: {} };
    }
  }
);

export default Announcement;
