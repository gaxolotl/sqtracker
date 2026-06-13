import { useEffect } from "react";
import { useRouter } from "next/router";
import getConfig from "next/config";
import { useCookies } from "react-cookie";
import getReqCookies from "./getReqCookies";

const Redirect = ({ path }) => {
  const router = useRouter();
  useEffect(() => {
    router.push(path);
  }, []);
  // eslint-disable-next-line react/react-in-jsx-scope
  return <></>;
};

export const withAuth = (Component, noRedirect = false) => {
  const Auth = (props) => {
    const [cookies] = useCookies();

    if (!cookies.token && !noRedirect) {
      // eslint-disable-next-line react/react-in-jsx-scope
      return <Redirect path="/login" />;
    }

    return (
      // eslint-disable-next-line react/react-in-jsx-scope
      <Component token={cookies.token} userId={cookies.userId} {...props} />
    );
  };

  return Auth;
};

export const withAuthServerSideProps = (
  getServerSideProps,
  publicAccess = false,
  noRedirect = false
) => {
  return async (ctx) => {
    let { token, userId } = getReqCookies(ctx.req);

    const {
      serverRuntimeConfig: { SQ_SERVER_SECRET },
      publicRuntimeConfig: { SQ_ALLOW_UNREGISTERED_VIEW },
    } = getConfig();

    const isPublicAccess = publicAccess && SQ_ALLOW_UNREGISTERED_VIEW && !token;

    if (!token && !noRedirect && !isPublicAccess)
      return {
        redirect: {
          permanent: false,
          destination: "/login",
        },
      };

    if (!token && noRedirect && !isPublicAccess) return { props: {} };

    if (isPublicAccess) {
      token = null;
      userId = null;
    }

    try {
      const fetchHeaders = {
        "Content-Type": "application/json",
        "X-Forwarded-For":
          ctx.req.headers["x-forwarded-for"] ?? ctx.req.socket.remoteAddress,
        "X-Sq-Server-Secret": SQ_SERVER_SECRET,
        "X-Sq-Public-Access": isPublicAccess,
      };

      if (token) {
        fetchHeaders["Authorization"] = `Bearer ${token}`;
      }

      const result = await getServerSideProps({
        ...ctx,
        token,
        userId,
        fetchHeaders,
        isPublicAccess,
      });

      if (result && result.notFound) {
        return { notFound: true };
      }

      const ssProps = result?.props || {};
      return { props: { ...ssProps, token } };
    } catch (e) {
      console.error("Error during server-side page render lifecycle:", e);

      if (e === "viewer_banned") {
        return {
          redirect: {
            permanent: false,
            destination: "/logout",
          },
        };
      }

      return { props: {} };
    }
  };
};
