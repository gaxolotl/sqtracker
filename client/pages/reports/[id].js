import React, { useContext } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import jwt from "jsonwebtoken";
import moment from "moment";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SEO from "../../components/SEO";
import Box from "../../components/Box";
import Text from "../../components/Text";
import Button from "../../components/Button";
import MarkdownBody from "../../components/MarkdownBody";
import { Info } from "../torrent/[infoHash]";
import { withAuthServerSideProps } from "../../utils/withAuth";
import { NotificationContext } from "../../components/Notifications";
import LoadingContext from "../../utils/LoadingContext";
import LocaleContext from "../../utils/LocaleContext";

const Report = ({ report, token, userRole }) => {
  const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;

  const router = useRouter();

  const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;
const SQ_JWT_SECRET = process.env.SQ_JWT_SECRET;

    const { role } = jwt.verify(token, SQ_JWT_SECRET);

    if (role !== "admin") return { props: { report: null, userRole: role } };

    try {
      const reportRes = await fetch(`${SQ_API_URL}/reports/${id}`, {
        headers: fetchHeaders,
      });
      if (
        reportRes.status === 403 &&
        (await reportRes.text()) === "User is banned"
      ) {
        throw "banned";
      }
      const report = await reportRes.json();
      return { props: { report, token, userRole: role } };
    } catch (e) {
      if (e === "banned") throw "banned";
      return { props: {} };
    }
  }
);

export default Report;
