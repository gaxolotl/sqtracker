import React, { useContext } from "react";
import jwt from "jsonwebtoken";
import styled from "styled-components";
import css from "@styled-system/css";
import SEO from "../components/SEO";
import Text from "../components/Text";
import { withAuthServerSideProps } from "../utils/withAuth";
import LocaleContext from "../utils/LocaleContext";

const StyledTable = styled.table(() =>
  css({
    borderCollapse: "collapse",
    "&, td": {
      border: "1px solid",
      borderColor: "border",
    },
    td: {
      px: 4,
      py: 3,
    },
  })
);

const Stats = ({ stats, userRole }) => {
  const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;
const SQ_JWT_SECRET = process.env.SQ_JWT_SECRET;

    const { role } = jwt.verify(token, SQ_JWT_SECRET);

    if (role !== "admin") return { props: { reports: [], userRole: role } };

    try {
      const statsRes = await fetch(`${SQ_API_URL}/admin/stats`, {
        headers: fetchHeaders,
      });
      if (
        statsRes.status === 403 &&
        (await statsRes.text()) === "User is banned"
      ) {
        throw "banned";
      }
      const stats = await statsRes.json();
      return { props: { stats, userRole: role } };
    } catch (e) {
      if (e === "banned") throw "banned";
      return { props: {} };
    }
  }
);

export default Stats;
