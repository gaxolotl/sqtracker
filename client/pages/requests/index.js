import React, { useContext } from "react";
import Link from "next/link";
import jwt from "jsonwebtoken";
import moment from "moment";
import { Check } from "@styled-icons/boxicons-regular/Check";
import { X } from "@styled-icons/boxicons-regular/X";
import SEO from "../../components/SEO";
import Box from "../../components/Box";
import Text from "../../components/Text";
import { withAuthServerSideProps } from "../../utils/withAuth";
import Button from "../../components/Button";
import List from "../../components/List";
import LocaleContext from "../../utils/LocaleContext";

const Requests = ({ requests = [] }) => {
  const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;
const SQ_JWT_SECRET = process.env.SQ_JWT_SECRET;

    const { role } = jwt.verify(token, SQ_JWT_SECRET);

    try {
      const requestsRes = await fetch(`${SQ_API_URL}/requests/page/0`, {
        headers: fetchHeaders,
      });
      if (
        requestsRes.status === 403 &&
        (await requestsRes.text()) === "User is banned"
      ) {
        throw "banned";
      }
      const requests = await requestsRes.json();

      return {
        props: { requests, userRole: role || "user" },
      };
    } catch (e) {
      if (e === "banned") throw "banned";
      return { props: { requests: [] } };
    }
  }
);

export default Requests;
