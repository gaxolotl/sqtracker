import React, { useState, useContext, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import moment from "moment";
import prettyBytes from "pretty-bytes";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jwt from "jsonwebtoken";
import { useCookies } from "react-cookie";
import slugify from "slugify";
import { File } from "@styled-icons/boxicons-regular/File";
import { Folder } from "@styled-icons/boxicons-regular/Folder";
import { Like } from "@styled-icons/boxicons-regular/Like";
import { Dislike } from "@styled-icons/boxicons-regular/Dislike";
import { Bookmark as BookmarkEmpty } from "@styled-icons/boxicons-regular/Bookmark";
import { Bookmark } from "@styled-icons/boxicons-solid/Bookmark";
import { withAuthServerSideProps } from "../../utils/withAuth";
import SEO from "../../components/SEO";
import Box from "../../components/Box";
import Text from "../../components/Text";
import Infobox from "../../components/Infobox";
import MarkdownBody from "../../components/MarkdownBody";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Comment from "../../components/Comment";
import Modal from "../../components/Modal";
import TorrentList from "../../components/TorrentList";
import { NotificationContext } from "../../components/Notifications";
import LoadingContext from "../../utils/LoadingContext";
import { TorrentFields } from "../upload";
import MarkdownInput from "../../components/MarkdownInput";
import LocaleContext from "../../utils/LocaleContext";

// from https://stackoverflow.com/a/44681235/7739519
const insert = (children = [], [head, ...tail], size) => {
  let child = children.find((child) => child.name === head);
  if (!child) children.push((child = { name: head, children: [] }));
  if (tail.length > 0) insert(child.children, tail, size);
  else child.size = size;
  return children;
};

export const Info = ({ title, items }) => (
  <Infobox mb={5}>
    {title && (
      <Text
        fontWeight={600}
        fontSize={1}
        _css={{ textTransform: "uppercase" }}
        mb={4}
      >
        {title}
      </Text>
    )}
    <Box display="grid" gridTemplateColumns="1fr" gridGap={[3, 2]}>
      {Object.entries(items).map(([key, val], i) =>
        val !== null && val !== undefined ? (
          <Box
            key={`infobox-row-${i}`}
            display="grid"
            gridTemplateColumns={["1fr", "1fr 2fr"]}
            gridGap={2}
            alignItems="center"
          >
            <Text
              fontWeight={600}
              fontSize={1}
              _css={{ textTransform: "uppercase" }}
            >
              {key}
            </Text>
            <Text>{val}</Text>
          </Box>
        ) : null
      )}
    </Box>
  </Infobox>
);

const WrapExpandable = ({ wrap, children }) =>
  wrap ? <details>{children}</details> : children;

const sortName = (a, b) => {
  if (a.name > b.name) return 1;
  if (a.name < b.name) return -1;
  return 0;
};

const FileItem = ({ file, depth = 0 }) => {
  return (
    <Box as="li" pl={`${depth * 22}px`} css={{ lineHeight: 1.75 }}>
      <WrapExpandable wrap={!!file.children.length}>
        <Box
          as="summary"
          _css={{
            cursor: file.children.length ? "pointer" : "caret",
            "&::marker": { color: "grey" },
          }}
        >
          <Text
            fontSize={1}
            icon={file.children.length ? Folder : File}
            iconSize={18}
            iconTextWrapperProps={{ verticalAlign: "middle" }}
          >
            {file.name}
            {file.size !== undefined ? (
              <>
                {" "}
                <Text as="span" color="grey">
                  ({prettyBytes(file.size)})
                </Text>
              </>
            ) : (
              "/"
            )}
          </Text>
        </Box>
        {!!file.children.length && (
          <Box as="ul" pl={0} css={{ listStyle: "none" }}>
            {file.children.sort(sortName).map((child) => (
              <FileItem
                key={`file-${child.name}-${depth}`}
                file={child}
                depth={depth + 1}
              />
            ))}
          </Box>
        )}
      </WrapExpandable>
    </Box>
  );
};

const Torrent = ({ token, torrent = {}, userId, userRole, uid, userStats }) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userVote, setUserVote] = useState(
    (torrent.userHasUpvoted && "up") ||
      (torrent.userHasDownvoted && "down") ||
      null
  );
  const [votes, setVotes] = useState({
    up: torrent.upvotes,
    down: torrent.downvotes,
  });
  const [comments, setComments] = useState(torrent.comments);
  const [isFreeleech, setIsFreeleech] = useState(torrent.freeleech);
  const [hasGroup, setHasGroup] = useState(!!torrent.group);
  const [bookmarked, setBookmarked] = useState(torrent.fetchedBy?.bookmarked);

  const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;
const SQ_TORRENT_CATEGORIES = process.env.NEXT_PUBLIC_SQ_TORRENT_CATEGORIES;
const SQ_SITE_WIDE_FREELEECH = process.env.NEXT_PUBLIC_SQ_SITE_WIDE_FREELEECH;
const SQ_MINIMUM_RATIO = process.env.NEXT_PUBLIC_SQ_MINIMUM_RATIO;
const SQ_MAXIMUM_HIT_N_RUNS = process.env.NEXT_PUBLIC_SQ_MAXIMUM_HIT_N_RUNS;

  const router = useRouter();

  const [cookies] = useCookies();

  const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;
const SQ_JWT_SECRET = process.env.SQ_JWT_SECRET;

    const { id, role } = token
      ? jwt.verify(token, SQ_JWT_SECRET)
      : { id: null, role: null };

    try {
      const torrentRes = await fetch(`${SQ_API_URL}/torrent/info/${infoHash}`, {
        headers: fetchHeaders,
      });

      if (
        torrentRes.status === 403 &&
        (await torrentRes.text()) === "User is banned"
      ) {
        throw "banned";
      }

      if (torrentRes.status === 404) return { notFound: true };

      const torrent = await torrentRes.json();

      const userStatsRes = await fetch(`${SQ_API_URL}/account/get-stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const userStats = await userStatsRes.json();

      return {
        props: { torrent, userId: id, userRole: role, uid: userId, userStats },
      };
    } catch (e) {
      if (e === "banned") throw "banned";
      return { props: {} };
    }
  },
  true
);

export default Torrent;
