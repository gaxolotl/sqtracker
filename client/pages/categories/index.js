import React, { useContext } from "react";
import Link from "next/link";
import styled from "styled-components";
import css from "@styled-system/css";
import slugify from "slugify";
import { withAuthServerSideProps } from "../../utils/withAuth";
import SEO from "../../components/SEO";
import Box from "../../components/Box";
import Text from "../../components/Text";
import LocaleContext from "../../utils/LocaleContext";

const CategoryItem = styled.li(() =>
  css({
    bg: "sidebar",
    height: "150px",
    borderRadius: 2,
    a: {
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 3,
    },
  })
);

const Categories = ({ tags }) => {
  const SQ_TORRENT_CATEGORIES = process.env.NEXT_PUBLIC_SQ_TORRENT_CATEGORIES;
  const SQ_API_URL = process.env.NEXT_PUBLIC_SQ_API_URL;

    try {
      const tagsRes = await fetch(`${SQ_API_URL}/torrent/tags`, {
        headers: fetchHeaders,
      });
      if (
        tagsRes.status === 403 &&
        (await tagsRes.text()) === "User is banned"
      ) {
        throw "banned";
      }
      const tags = await tagsRes.json();
      return { props: { tags } };
    } catch (e) {
      if (e === "banned") throw "banned";
      return { props: {} };
    }
  },
  true
);

export default Categories;
