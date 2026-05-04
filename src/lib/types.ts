export type PostType = 'rich' | 'short' | 'vote' | 'video' | 'event';

export interface User {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
  level: number;
  followers: number;
  following: number;
  posts: number;
  badges: Badge[];
  joinedAt: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string; // emoji
  description: string;
  obtained: boolean;
}

export interface Board {
  id: string;
  slug: string;
  name: string;
  description: string;
  cover: string;
  icon: string; // emoji
  members: number;
  posts: number;
}

export interface Comment {
  id: string;
  author: User;
  content: string;
  createdAt: string;
  likes: number;
  replies?: Comment[];
}

export interface VoteOption {
  id: string;
  label: string;
  votes: number;
}

export interface Post {
  id: string;
  type: PostType;
  title: string;
  // 富文本:html 字符串;短内容:纯文本
  content: string;
  images?: string[];
  videoUrl?: string;
  cover?: string;
  author: User;
  board: Board;
  tags: string[];
  createdAt: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  // 投票贴
  vote?: {
    question: string;
    options: VoteOption[];
    multi: boolean;
    deadline: string;
  };
  // EVENT 贴
  event?: {
    startAt: string;
    endAt: string;
    location: string;
    attendees: number;
  };
  commentList?: Comment[];
}

export interface PlantSpecies {
  id: string;
  slug: string;
  name: string;
  latinName: string;
  family: string; // 科属
  cover: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  light: string;
  watering: string;
  hardiness: string; // 耐寒度
  description: string;
  tips: string[];
  gallery: string[];
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'system' | 'mention';
  fromUser?: User;
  text: string;
  link?: string;
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  user: User;
  lastMessage: string;
  lastAt: string;
  unread: number;
  messages: Message[];
}

export interface Message {
  id: string;
  from: 'me' | 'other';
  text: string;
  at: string;
}

export interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  tint: string; // tailwind color class for overlay
}
