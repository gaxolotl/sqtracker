import React, { useContext, useState, useEffect } from "react";
import Link from "next/link";
import NextErrorComponent from "next/error";
import * as Sentry from "@sentry/nextjs";
import SEO from "../components/SEO";
import Text from "../components/Text";
import LocaleContext from "../utils/LocaleContext";

const ErrorPage = () => {
  const [rateLimited, setRateLimited] = useState(false);

  const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;

  useEffect(() => {
    const checkRateLimit = async () => {
      try {
        const res = await fetch(SQ_API_URL);
        if (res.status === 429) setRateLimited(true);
      } catch (e) {}
    };
    checkRateLimit();
  }, []);

  const { getLocaleString } = useContext(LocaleContext);

  return (
    <>
      <SEO title={getLocaleString("404NotFound")} />
      <Text as="h1" mb={5}>
        {getLocaleString("errSomethingWentWrong")} :(
      </Text>
      {rateLimited ? (
        <Text>{getLocaleString("errTooManyRequests")}</Text>
      ) : (
        <Text>
          {getLocaleString("errIfErrorPersist")}{" "}
          <a
            href="https://github.com/tdjsnelling/sqtracker/issues"
            target="_blank"
            rel="noreferrer"
          >
            {getLocaleString("errReportIt")}
          </a>
          . For now,{" "}
          <Link href="/">
            {getLocaleString("404ReturnHome")}
          </Link>
          .
        </Text>
      )}
    </>
  );
};

ErrorPage.getInitialProps = async (contextData) => {
  await Sentry.captureUnderscoreErrorException(contextData);
  return NextErrorComponent.getInitialProps(contextData);
};

export default ErrorPage;
