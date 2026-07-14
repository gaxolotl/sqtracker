import React, { useContext } from "react";
import { useRouter } from "next/router";
import jwt from "jsonwebtoken";
import SEO from "../../components/SEO";
import Text from "../../components/Text";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { withAuthServerSideProps } from "../../utils/withAuth";
import { NotificationContext } from "../../components/Notifications";
import LoadingContext from "../../utils/LoadingContext";
import MarkdownInput from "../../components/MarkdownInput";
import LocaleContext from "../../utils/LocaleContext";

const NewRequest = ({ token }) => {
  const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;

  const SQ_JWT_SECRET = process.env.SQ_JWT_SECRET;

  const { role } = jwt.verify(token, SQ_JWT_SECRET);

  return { props: { token, userRole: role } };
});

export default NewRequest;
