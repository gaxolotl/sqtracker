import React, { useContext } from "react";
import jwt from "jsonwebtoken";
import moment from "moment";
import SEO from "../../components/SEO";
import Text from "../../components/Text";
import { withAuthServerSideProps } from "../../utils/withAuth";
import List from "../../components/List";
import LocaleContext from "../../utils/LocaleContext";

const Reports = ({ reports, userRole }) => {
  const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;
const SQ_JWT_SECRET = process.env.SQ_JWT_SECRET;

    const { role } = jwt.verify(token, SQ_JWT_SECRET);

    if (role !== "admin") return { props: { reports: [], userRole: role } };

    try {
      const reportsRes = await fetch(`${SQ_API_URL}/reports/page/0`, {
        headers: fetchHeaders,
      });
      if (
        reportsRes.status === 403 &&
        (await reportsRes.text()) === "User is banned"
      ) {
        throw "banned";
      }
      const reports = await reportsRes.json();
      return { props: { reports, userRole: role } };
    } catch (e) {
      if (e === "banned") throw "banned";
      return { props: {} };
    }
  }
);

export default Reports;
