export type UserRef = {
  _id?: string;
  username: string;
};

export type CommentRecord = {
  _id: string;
  comment: string;
  created: number;
  user?: UserRef;
  torrent?: { name: string; infoHash: string };
  announcement?: { title: string; slug: string };
  request?: { title: string; index: number };
};

export type Torrent = {
  _id?: string;
  infoHash: string;
  name: string;
  description?: string;
  type?: string;
  source?: string;
  poster?: string;
  uploadedBy?: UserRef;
  anonymous?: boolean;
  size?: number;
  files?: Array<{ name?: string; path?: string; length?: number; size?: number }>;
  created: number;
  downloads?: number;
  complete?: number;
  incomplete?: number;
  seeders?: number;
  leechers?: number;
  upvotes?: string[] | number;
  downvotes?: string[] | number;
  userHasUpvoted?: boolean;
  userHasDownvoted?: boolean;
  fetchedBy?: { bookmarked?: boolean };
  freeleech?: boolean;
  tags?: string[];
  mediaInfo?: string;
  comments?: CommentRecord[] | { count: number };
  groupTorrents?: Torrent[];
};

export type UserProfile = {
  _id: string;
  username: string;
  email?: string;
  emailVerified?: boolean;
  created: number;
  role: string;
  remainingInvites?: number;
  banned?: boolean;
  banReason?: string;
  bonusPoints?: number;
  ratio?: number;
  hitnruns?: number;
  downloaded?: { bytes?: number; count?: number };
  uploaded?: { bytes?: number; count?: number };
  torrents?: Torrent[];
  comments?: CommentRecord[];
  totp?: { enabled?: boolean };
};

export type Announcement = {
  _id: string;
  title: string;
  slug: string;
  body?: string;
  pinned?: boolean;
  allowComments?: boolean;
  created: number;
  updated?: number;
  createdBy?: UserRef;
  comments?: CommentRecord[];
};

export type TrackerRequest = {
  _id: string;
  index: number;
  title: string;
  body?: string;
  created: number;
  createdBy?: UserRef;
  candidates?: Torrent[];
  fulfilledBy?: string | { torrent?: string };
  comments?: CommentRecord[];
};

export type Report = {
  _id: string;
  reason: string;
  solved: boolean;
  created: number;
  reportedBy?: UserRef;
  torrent?: Torrent;
};

export type TrackerStats = {
  registeredUsers: number;
  bannedUsers: number;
  uploadedTorrents: number;
  completedDownloads: number;
  totalInvitesSent: number;
  invitesAccepted: number;
  totalRequests: number;
  filledRequests: number;
  totalComments: number;
  activeTorrents: number;
  peers: number;
  seeders: number;
  leechers: number;
};

export type Invite = {
  _id: string;
  email: string;
  role: string;
  claimed: boolean;
  created: number;
  validUntil: number;
  token: string;
};

export type TrackerConfig = {
  siteName: string;
  siteDescription: string;
  allowRegister: "open" | "invite" | "closed";
  allowAnonymousUploads: boolean;
  categories: Record<string, string[]>;
  siteWideFreeleech: boolean;
  allowUnregisteredView: boolean;
  defaultLocale: string;
  customTheme?: Record<string, string>;
};

export type WikiPage = {
  _id?: string;
  slug: string;
  title: string;
  body?: string;
  public?: boolean;
  created?: number;
  createdBy?: UserRef;
};

export type WikiResponse = {
  page: WikiPage;
  allPages: Array<Pick<WikiPage, "slug" | "title">>;
};
