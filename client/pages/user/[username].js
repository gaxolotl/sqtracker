import React, { useState, useContext, useMemo } from "react";
import getConfig from "next/config";
import Link from "next/link";
import { useCookies } from "react-cookie";
import moment from "moment";
import prettyBytes from "pretty-bytes";
import jwt from "jsonwebtoken";
import { Sort } from "@styled-icons/boxicons-regular/Sort";
import { Run } from "@styled-icons/boxicons-regular/Run";
import { Upload } from "@styled-icons/boxicons-regular/Upload";
import { Download } from "@styled-icons/boxicons-regular/Download";
import { UserCircle } from "@styled-icons/boxicons-regular/UserCircle";
import { NoEntry } from "@styled-icons/boxicons-regular/NoEntry";
import { withAuthServerSideProps } from "../../utils/withAuth";
import SEO from "../../components/SEO";
import Box from "../../components/Box";
import Text from "../../components/Text";
import Button from "../../components/Button";
import Infobox from "../../components/Infobox";
import TorrentList from "../../components/TorrentList";
import Comment from "../../components/Comment";
import Modal from "../../components/Modal";
import Input from "../../components/Input";
import { NotificationContext } from "../../components/Notifications";
import LoadingContext from "../../utils/LoadingContext";
import LocaleContext from "../../utils/LocaleContext";

const User = ({ token, user, userRole }) => {
  const [banned, setBanned] = useState(!!user?.banned);
  const [banReason, setBanReason] = useState(user?.banReason || "none");
  const [showBanModal, setShowBanModal] = useState(false);
  const [reasonInput, setReasonInput] = useState("");

  React.useEffect(() => {
    if (user) {
      setBanned(!!user.banned);
      setBanReason(user.banReason || "none");
    }
  }, [user?.username, user?.banned, user?.banReason]);

  const { addNotification } = useContext(NotificationContext);
  const { setLoading } = useContext(LoadingContext);

  const [cookies] = useCookies();
  const { getLocaleString } = useContext(LocaleContext);

  if (!user) {
    return <Text p={5}>User data unavailable.</Text>;
  }

  const {
    publicRuntimeConfig: {
      SQ_TORRENT_CATEGORIES,
      SQ_MINIMUM_RATIO,
      SQ_MAXIMUM_HIT_N_RUNS,
      SQ_API_URL,
    },
  } = getConfig();

  const downloadedBytes = prettyBytes(user.downloaded?.bytes || 0).split(" ");
  const uploadedBytes = prettyBytes(user.uploaded?.bytes || 0).split(" ");

  const handleBanUser = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(
        `${SQ_API_URL}/user/${banned ? "unban" : "ban"}/${user.username}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reason: banned ? "" : reasonInput.trim(),
          }),
        }
      );

      if (res.status !== 200) {
        const reason = await res.text();
        throw new Error(reason);
      }

      addNotification(
        "success",
        `${user.username} ${
          banned
            ? getLocaleString("userUnbanned")
            : getLocaleString("userBanned")
        } ${getLocaleString("userSuccessfully")}`
      );

      const finalReason = banned ? "none" : reasonInput.trim() || "none";
      setBanReason(finalReason);
      setBanned((b) => !b);
      setReasonInput("");
      setShowBanModal(false);
    } catch (e) {
      addNotification(
        "error",
        `${getLocaleString("userCouldNot")} ${
          banned ? getLocaleString("userUnban") : getLocaleString("userBan")
        } ${user.username}: ${e.message}`
      );
      console.error(e);
    }

    setLoading(false);
  };

  const cards = useMemo(() => {
    let c = 2;
    if (SQ_MINIMUM_RATIO !== -1) c++;
    if (SQ_MAXIMUM_HIT_N_RUNS !== -1) c++;
    return c;
  }, [SQ_MINIMUM_RATIO, SQ_MAXIMUM_HIT_N_RUNS]);

  return (
    <>
      <SEO title={`${user.username} ${getLocaleString("userProfile")}`} />
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={3}
      >
        <Box display="flex" alignItems="center">
          <Text as="h1">
            {user.username} {getLocaleString("userProfile")}
          </Text>
          {user.role === "admin" && (
            <Text icon={UserCircle} iconColor="primary" ml={3}>
              {getLocaleString("userAdmin")}
            </Text>
          )}
          {banned && (
            <Box display="flex" alignItems="center">
              <Text icon={NoEntry} iconColor="error" ml={4}>
                {getLocaleString("userBanned")}
              </Text>
              <Text color="grey" fontSize={1} ml={2}>
                ({getLocaleString("Reason") || "Reason"}: {banReason})
              </Text>
            </Box>
          )}
        </Box>
        {cookies.username === user.username && (
          <Link href="/account">
            <a>
              <Button>{getLocaleString("accMyAccount")}</Button>
            </a>
          </Link>
        )}
        {userRole === "admin" && cookies.username !== user.username && (
          <Button onClick={() => setShowBanModal(true)}>
            {banned ? getLocaleString("userUnban") : getLocaleString("userBan")}{" "}
            {user.username}
          </Button>
        )}
      </Box>
      <Box mb={5}>
        <Text color="grey">
          {getLocaleString("userUserSince")}{" "}
          {moment(user.created).format(
            `${getLocaleString("userUserSinceTime")}`
          )}
        </Text>
      </Box>
      {userRole === "admin" && (
        <Infobox mb={5}>
          <Text
            fontWeight={600}
            fontSize={1}
            mb={3}
            _css={{ textTransform: "uppercase" }}
          >
            {getLocaleString("userOnlyAdminsSee")}
          </Text>
          <ul>
            {user.email && (
              <li>
                {getLocaleString("email")}: {user.email}
              </li>
            )}
            {typeof user.emailVerified === "boolean" && (
              <li>
                {getLocaleString("userEmailVerified")}:{" "}
                {user.emailVerified ? "yes" : "no"}
              </li>
            )}
            {user.invitedBy && user.invitedBy.username && (
              <li>
                {getLocaleString("userInvitedBy")}:{" "}
                <Link href={`/user/${user.invitedBy.username}`}>
                  <a>{user.invitedBy.username}</a>
                </Link>
              </li>
            )}
            {typeof user.remainingInvites === "number" && (
              <li>
                {getLocaleString("userRemainingInvites")}:{" "}
                {user.remainingInvites}
              </li>
            )}
            {typeof user.bonusPoints === "number" && (
              <li>
                {getLocaleString("accBonusPoints")}: {user.bonusPoints}
              </li>
            )}
            {banned && <li>Ban Reason: {banReason}</li>}
          </ul>
        </Infobox>
      )}
      <Box
        display="grid"
        gridTemplateColumns={["1fr", `repeat(${cards}, 1fr)`]}
        gridGap={4}
        mb={5}
      >
        {SQ_MINIMUM_RATIO !== -1 && (
          <Box bg="sidebar" borderRadius={2} p={4}>
            <Text
              fontWeight={600}
              fontSize={1}
              mb={3}
              _css={{ textTransform: "uppercase" }}
              icon={Sort}
              iconColor="text"
            >
              {getLocaleString("userRatio")}
            </Text>
            <Text fontSize={5}>
              {typeof user.ratio === "number"
                ? user.ratio === -1
                  ? "N/A"
                  : user.ratio.toFixed(2)
                : "?"}
              {typeof user.ratio === "number" && user.ratio !== -1 && (
                <Text
                  as="span"
                  fontSize={3}
                  color={user.ratio >= SQ_MINIMUM_RATIO ? "success" : "error"}
                >
                  {" "}
                  {user.ratio >= SQ_MINIMUM_RATIO ? ">" : "<"}{" "}
                  {SQ_MINIMUM_RATIO}
                </Text>
              )}
            </Text>
          </Box>
        )}
        {SQ_MAXIMUM_HIT_N_RUNS !== -1 && (
          <Box bg="sidebar" borderRadius={2} p={4}>
            <Text
              fontWeight={600}
              fontSize={1}
              mb={3}
              _css={{ textTransform: "uppercase" }}
              icon={Run}
              iconColor="text"
            >
              {getLocaleString("userHitNRuns")}
            </Text>
            <Text fontSize={5}>
              {typeof user.hitnruns === "number" ? user.hitnruns : "?"}
              {typeof user.hitnruns === "number" && (
                <Text
                  as="span"
                  fontSize={3}
                  color={
                    user.hitnruns <= SQ_MAXIMUM_HIT_N_RUNS ? "success" : "error"
                  }
                >
                  {" "}
                  {user.hitnruns <= SQ_MAXIMUM_HIT_N_RUNS ? "<" : ">"}{" "}
                  {SQ_MAXIMUM_HIT_N_RUNS}
                </Text>
              )}
            </Text>
          </Box>
        )}
        <Box bg="sidebar" borderRadius={2} p={4}>
          <Text
            fontWeight={600}
            fontSize={1}
            mb={3}
            _css={{ textTransform: "uppercase" }}
            icon={Download}
            iconColor="text"
          >
            {getLocaleString("userDownloaded")}
          </Text>
          <Text fontSize={5}>
            {downloadedBytes[0]}
            <Text as="span" fontSize={4}>
              {" "}
              {downloadedBytes[1]}
            </Text>
          </Text>
        </Box>
        <Box bg="sidebar" borderRadius={2} p={4}>
          <Text
            fontWeight={600}
            fontSize={1}
            mb={3}
            _css={{ textTransform: "uppercase" }}
            icon={Upload}
            iconColor="text"
          >
            {getLocaleString("userUploaded")}
          </Text>
          <Text fontSize={5}>
            {uploadedBytes[0]}
            <Text as="span" fontSize={4}>
              {" "}
              {uploadedBytes[1]}
            </Text>
          </Text>
        </Box>
      </Box>
      <Text as="h2" mb={4}>
        {getLocaleString("userMyUploads")}
      </Text>
      <Box mb={5}>
        <TorrentList
          torrents={user.torrents}
          categories={SQ_TORRENT_CATEGORIES}
        />
      </Box>
      <Text as="h2" mb={4}>
        {getLocaleString("userComments")}
      </Text>
      {user.comments?.length ? (
        <Box>
          {user.comments.map((comment) => (
            <Comment
              key={`comment-${comment._id}`}
              comment={{ ...comment, user: { username: user.username } }}
            />
          ))}
        </Box>
      ) : (
        <Text color="grey">{getLocaleString("userNoComments")}</Text>
      )}
      {showBanModal && (
        <Modal close={() => setShowBanModal(false)}>
          <form onSubmit={handleBanUser}>
            <Text mb={4}>
              {getLocaleString("userYouSureWant")}{" "}
              {banned
                ? getLocaleString("userUnban")
                : getLocaleString("userBan")}{" "}
              {getLocaleString("userThisUserQ")}
            </Text>

            {!banned && (
              <Box mb={4}>
                <Input
                  name="reason"
                  label={
                    getLocaleString("userBanReason") || "Optional Ban Reason"
                  }
                  placeholder='Leave blank for "none"'
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                />
              </Box>
            )}

            <Box display="flex" justifyContent="flex-end">
              <Button
                type="button"
                onClick={() => setShowBanModal(false)}
                variant="secondary"
                mr={3}
              >
                {getLocaleString("accCancel")}
              </Button>
              <Button type="submit" variant={banned ? "primary" : "danger"}>
                {banned
                  ? getLocaleString("userUnban")
                  : getLocaleString("userBan")}
              </Button>
            </Box>
          </form>
        </Modal>
      )}
    </>
  );
};

export const getServerSideProps = withAuthServerSideProps(
  async ({ token, fetchHeaders, query: { username } }) => {
    if (!token) return { props: {} };

    const {
      publicRuntimeConfig: { SQ_API_URL },
      serverRuntimeConfig: { SQ_JWT_SECRET },
    } = getConfig();

    const { role } = jwt.verify(token, SQ_JWT_SECRET);

    try {
      const userRes = await fetch(`${SQ_API_URL}/user/${username}`, {
        headers: fetchHeaders,
      });

      if (userRes.status === 403) {
        const responseText = await userRes.text();
        if (responseText.startsWith("User is banned")) {
          throw "viewer_banned";
        }
      }

      if (userRes.status === 404) return { notFound: true };

      const user = await userRes.json();
      return { props: { token, user, userRole: role } };
    } catch (e) {
      if (e === "viewer_banned") throw "viewer_banned";
      return { props: {} };
    }
  }
);

export default User;
