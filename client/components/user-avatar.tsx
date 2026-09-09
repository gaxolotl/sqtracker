"use client";

import Image from "next/image";
import { useState } from "react";
import { apiOrigin } from "@/lib/api";

export function UserAvatar({
  username,
  avatarUpdated,
  fallback,
  className,
  size = 48,
}: {
  username?: string;
  avatarUpdated?: number;
  fallback?: string;
  className: string;
  size?: number;
}) {
  const [failedSource, setFailedSource] = useState("");
  const name = fallback || username || "?";
  const version = avatarUpdated ? `?v=${avatarUpdated}` : "";
  const source =
    username && avatarUpdated
      ? `${apiOrigin()}/user/${encodeURIComponent(username)}/avatar${version}`
      : "";

  return (
    <span className={className} aria-hidden="true">
      {source && failedSource !== source ? (
        <Image
          src={source}
          width={size}
          height={size}
          alt=""
          unoptimized
          onError={() => setFailedSource(source)}
        />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
