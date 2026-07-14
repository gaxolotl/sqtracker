import React, { useContext, useState } from "react";
import { useRouter } from "next/router";
import jwt from "jsonwebtoken";
import slugify from "slugify";
import SEO from "../../components/SEO";
import Text from "../../components/Text";
import Input from "../../components/Input";
import Button from "../../components/Button";
import MarkdownInput from "../../components/MarkdownInput";
import { withAuthServerSideProps } from "../../utils/withAuth";
import { NotificationContext } from "../../components/Notifications";
import LoadingContext from "../../utils/LoadingContext";
import Checkbox from "../../components/Checkbox";
import LocaleContext from "../../utils/LocaleContext";

export const WikiFields = ({ values }) => {
  const [slugValue, setSlugValue] = useState(values?.slug);

  const SQ_BASE_URL = process.env.NEXT_PUBLIC_SQ_BASE_URL;
const SQ_ALLOW_UNREGISTERED_VIEW = process.env.NEXT_PUBLIC_SQ_ALLOW_UNREGISTERED_VIEW;

  const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.target);

    try {
      const createWikiRes = await fetch(`${SQ_API_URL}/wiki/new`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slug: form.get("slug"),
          title: form.get("title"),
          body: form.get("body"),
          public: !!form.get("public"),
        }),
      });

      if (createWikiRes.status !== 200) {
        const reason = await createWikiRes.text();
        throw new Error(reason);
      }

      addNotification("success", `${getLocaleString("wikiPageCreateSuccess")}`);

      const slug = await createWikiRes.text();
      router.push(`/wiki/${slug}`);
    } catch (e) {
      addNotification(
        "error",
        `${getLocaleString("wikiCouldNotCreatePage")}: ${e.message}`
      );
      console.error(e);
    }

    setLoading(false);
  };

  return (
    <>
      <SEO title={getLocaleString("wikiNewPage")} />
      <Text as="h1" mb={5}>
        {getLocaleString("wikiNewPage")}
      </Text>
      <form onSubmit={handleCreate}>
        <WikiFields />
        <Button display="block" ml="auto">
          {getLocaleString("wikiCreatePage")}
        </Button>
      </form>
    </>
  );
};

export const getServerSideProps = withAuthServerSideProps(async ({ token }) => {
  if (!token) return { props: {} };

  const SQ_JWT_SECRET = process.env.SQ_JWT_SECRET;

  const { role } = jwt.verify(token, SQ_JWT_SECRET);

  return { props: { token, userRole: role } };
});

export default NewWiki;
