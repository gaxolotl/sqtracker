import React, { useState, useContext, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import moment from "moment";
import jwt from "jsonwebtoken";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCookies } from "react-cookie";
import SEO from "../../components/SEO";
import Box from "../../components/Box";
import Text from "../../components/Text";
import Button from "../../components/Button";
import MarkdownBody from "../../components/MarkdownBody";
import { withAuthServerSideProps } from "../../utils/withAuth";
import { NotificationContext } from "../../components/Notifications";
import Input from "../../components/Input";
import Comment from "../../components/Comment";
import Modal from "../../components/Modal";
import List from "../../components/List";
import { ListUl } from "@styled-icons/boxicons-regular/ListUl";
import slugify from "slugify";
import { Check } from "@styled-icons/boxicons-regular/Check";
import { X } from "@styled-icons/boxicons-regular/X";
import LoadingContext from "../../utils/LoadingContext";
import LocaleContext from "../../utils/LocaleContext";

const Request = ({ request, token, user }) => {
  const [comments, setComments] = useState(request.comments);
  const [candidates, setCandidates] = useState(request.candidates.reverse());
  const [fulfilledBy, setFulfilledBy] = useState(request.fulfilledBy);
  const [showSuggestModal, setShowSuggestModal] = useState(false);

  const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;
const SQ_SITE_WIDE_FREELEECH = process.env.NEXT_PUBLIC_SQ_SITE_WIDE_FREELEECH;
const SQ_TORRENT_CATEGORIES = process.env.NEXT_PUBLIC_SQ_TORRENT_CATEGORIES;

  const router = useRouter();

  const [cookies] = useCookies();

  const handleDelete = async () => {
    setLoading(true);

    try {
      const deleteRes = await fetch(`${SQ_API_URL}/requests/${request.index}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (deleteRes.status !== 200) {
        const reason = await deleteRes.text();
        throw new Error(reason);
      }

      addNotification("success", `${getLocaleString("reqRequestDelSuccess")}`);

      router.push("/requests");
    } catch (e) {
      addNotification(
        "error",
        `${getLocaleString("reqCouldNotDelReq")}: ${e.message}`
      );
      console.error(e);
    }

    setLoading(false);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.target);

    try {
      const commentRes = await fetch(
        `${SQ_API_URL}/requests/comment/${request._id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            comment: form.get("comment"),
          }),
        }
      );

      if (commentRes.status !== 200) {
        const reason = await commentRes.text();
        throw new Error(reason);
      }

      addNotification("success", `${getLocaleString("reqCommentPostSuccess")}`);

      setComments((c) => {
        const newComment = {
          comment: form.get("comment"),
          created: Date.now(),
          user: {
            username: cookies.username,
          },
        };
        return [newComment, ...c];
      });

      commentInputRef.current.value = "";
    } catch (e) {
      addNotification(
        "error",
        `${getLocaleString("reqCommentNotPost")}: ${e.message}`
      );
      console.error(e);
    }

    setLoading(false);
  };

  const handleSuggestion = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.target);

    try {
      const suggestRes = await fetch(
        `${SQ_API_URL}/requests/suggest/${request._id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            infoHash: form.get("infoHash"),
          }),
        }
      );

      if (suggestRes.status !== 200) {
        const reason = await suggestRes.text();
        throw new Error(reason);
      }

      addNotification(
        "success",
        `${getLocaleString("reqSuggestionAddSuccess")}`
      );

      const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;
const SQ_JWT_SECRET = process.env.SQ_JWT_SECRET;

    const { id } = jwt.verify(token, SQ_JWT_SECRET);

    try {
      const requestRes = await fetch(`${SQ_API_URL}/requests/${index}`, {
        headers: fetchHeaders,
      });
      if (
        requestRes.status === 403 &&
        (await requestRes.text()) === "User is banned"
      ) {
        throw "banned";
      }
      const request = await requestRes.json();
      return { props: { request, token, user: id } };
    } catch (e) {
      if (e === "banned") throw "banned";
      return { props: {} };
    }
  }
);

export default Request;
