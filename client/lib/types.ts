export type UserRef = {
  _id?: string;
  username: string;
  avatarUpdated?: number;
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
  files?: Array<{
    name?: string | number[] | { type?: string; data?: number[] };
    path?: string | number[] | { type?: string; data?: number[] };
    length?: number;
    size?: number;
  }>;
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
  bio?: string;
  location?: string;
  website?: string;
  avatarUpdated?: number;
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
  showPageInTitle: boolean;
  allowRegister: "open" | "invite" | "closed";
  allowAnonymousUploads: boolean;
  categories: Record<string, string[]>;
  siteWideFreeleech: boolean;
  allowUnregisteredView: boolean;
  defaultLocale: string;
  customTheme?: Record<string, string>;
  avatarMaxResolution: number;
  avatarMaxSizeKb: number;
  allowGifAvatars: boolean;
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

export type ForumCategory = {
  _id: string;
  name: string;
  description?: string;
  sortOrder: number;
  icon?: string;
  created: number;
  threadCount?: number;
  postCount?: number;
  latestThread?:
    (Partial<ForumThread> & Pick<ForumThread, "_id" | "title">) | null;
};

export type ForumLastPost = {
  userId?: string;
  body: string;
  created: number;
  author?: UserRef | null;
};

export type ForumThread = {
  _id: string;
  category: ForumCategory | string;
  title: string;
  body?: string;
  createdBy?: string;
  author?: UserRef | null;
  created: number;
  updated: number;
  pinned: boolean;
  locked: boolean;
  views: number;
  postCount: number;
  lastPost?: ForumLastPost;
};

export type ForumPost = {
  _id: string;
  thread: string;
  userId?: string;
  author?: UserRef | null;
  body: string;
  created: number;
  edited?: number;
};

export type ForumThreadPage = {
  category: ForumCategory;
  total: number;
  page: number;
  pageSize: number;
  threads: ForumThread[];
};

export type ForumPostPage = {
  total: number;
  page: number;
  pageSize: number;
  posts: ForumPost[];
};

export type DirectMessage = {
  _id: string;
  sender: UserRef | null;
  body: string;
  created: number;
  readBy: string[];
};

export type Conversation = {
  _id: string;
  participants: UserRef[];
  createdBy: string;
  created: number;
  subject?: string;
  lastMessage?: {
    userId?: UserRef;
    body: string;
    created: number;
  } | null;
  unreadCount?: number;
};

export type ConversationPage = {
  total: number;
  page: number;
  pageSize: number;
  conversations: Conversation[];
};

export type DirectMessagePage = {
  total: number;
  page: number;
  pageSize: number;
  messages: DirectMessage[];
};
