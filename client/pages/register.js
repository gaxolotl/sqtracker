import React, { useContext } from "react";
import { useRouter } from "next/router";
import { useCookies } from "react-cookie";
import jwt from "jsonwebtoken";
import { ThemeContext } from "styled-components";
import { transparentize } from "polished";
import SEO from "../components/SEO";
import Text from "../components/Text";
import Input from "../components/Input";
import Button from "../components/Button";
import Box from "../components/Box";
import { NotificationContext } from "../components/Notifications";
import LoadingContext from "../utils/LoadingContext";
import LocaleContext from "../utils/LocaleContext";

export const usernamePattern = "[A-Za-z0-9.]+";

const Register = ({ token: inviteToken, tokenError }) => {
  const [, setCookie] = useCookies();

  const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;
const SQ_ALLOW_REGISTER = process.env.NEXT_PUBLIC_SQ_ALLOW_REGISTER;

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.target);

    try {
      const res = await fetch(`${SQ_API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.get("email"),
          username: form.get("username"),
          password: form.get("password"),
          invite: inviteToken,
        }),
      });

      if (res.status !== 200) {
        const reason = await res.text();
        throw new Error(reason);
      }

      const SQ_JWT_SECRET = process.env.SQ_JWT_SECRET;
const SQ_ALLOW_REGISTER = process.env.SQ_ALLOW_REGISTER;
  if (SQ_ALLOW_REGISTER === "open") return { props: {} };
  if (!token && SQ_ALLOW_REGISTER === "invite")
    return { props: { tokenError: "Invite token not provided" } };
  try {
    const decoded = await jwt.verify(token, SQ_JWT_SECRET);
    if (decoded.validUntil < Date.now())
      return { props: { tokenError: "Invite has expired" } };
    return { props: { token } };
  } catch (e) {
    return { props: { tokenError: e.message } };
  }
};

export default Register;
