import React, { useContext } from "react";
import { useRouter } from "next/router";
import jwt from "jsonwebtoken";
import SEO from "../../components/SEO";
import Text from "../../components/Text";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { NotificationContext } from "../../components/Notifications";
import LoadingContext from "../../utils/LoadingContext";
import LocaleContext from "../../utils/LocaleContext";

const FinalisePasswordReset = ({ token, email, tokenError }) => {
  const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;

  const handleInitiate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.target);

    try {
      const res = await fetch(`${SQ_API_URL}/reset-password/finalise`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newPassword: form.get("newPassword"),
          email,
          token,
        }),
      });

      if (res.status !== 200) {
        const reason = await res.text();
        throw new Error(reason);
      }

      addNotification("success", getLocaleString("passwordResetSuccess"));

      router.push("/login");
    } catch (e) {
      addNotification(
        "error",
        `${getLocaleString("passwordResetFailed")}: ${e.message}`
      );
      console.error(e);
    }

    setLoading(false);
  };

  return (
    <>
      <SEO title={getLocaleString("resetPassword")} />
      <Text as="h1" mb={5}>
        {getLocaleString("resetPassword")}
      </Text>
      <Input
        type="email"
        label={getLocaleString("email")}
        value={email}
        mb={4}
        disabled
      />
      {!tokenError ? (
        <form onSubmit={handleInitiate}>
          <Input
            name="newPassword"
            type="password"
            label={getLocaleString("newPassword")}
            mb={4}
            required
          />
          <Button>{getLocaleString("resetPassword")}</Button>
        </form>
      ) : (
        <p>
          {getLocaleString("tokenError")}: {tokenError}
        </p>
      )}
    </>
  );
};

export const getServerSideProps = async ({ query: { token } }) => {
  const SQ_JWT_SECRET = process.env.SQ_JWT_SECRET;
  if (!token) return { props: { tokenError: "Token not provided" } };
  try {
    const decoded = await jwt.verify(token, SQ_JWT_SECRET);
    if (decoded.validUntil < Date.now()) {
      return {
        props: { email: decoded.user, tokenError: "Token has expired" },
      };
    }
    return { props: { token, email: decoded.user } };
  } catch (e) {
    return { props: { tokenError: e.message } };
  }
};

export default FinalisePasswordReset;
