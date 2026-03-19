import { pgTable, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  name: text('name'),
  email: text('email'),
  avatar: text('avatar'),
  title: text('title').default('Developer'),
  isVerified: boolean('is_verified').default(false),
  isDeveloper: boolean('is_developer').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const posts = pgTable('posts', {
  id: text('id').primaryKey(),
  authorId: text('author_id').notNull().references(() => users.id),
  title: text('title'),
  code: text('code').notNull(),
  language: text('language'),
  filename: text('filename'),
  description: text('description'),
  theme: text('theme'),
  forkedFromId: text('forked_from_id'),
  isFork: boolean('is_fork').default(false),
  likesCount: integer('likes_count').default(0).notNull(),
  dislikesCount: integer('dislikes_count').default(0).notNull(),
  commentsCount: integer('comments_count').default(0).notNull(),
  remixesCount: integer('remixes_count').default(0).notNull(),
  runsCount: integer('runs_count').default(0).notNull(),
  allowComments: boolean('allow_comments').default(true).notNull(),
  allowRemixes: boolean('allow_remixes').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const likes = pgTable('likes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  postId: text('post_id').notNull().references(() => posts.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const dislikes = pgTable('dislikes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  postId: text('post_id').notNull().references(() => posts.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const comments = pgTable('comments', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  postId: text('post_id').notNull().references(() => posts.id),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const runs = pgTable('runs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  postId: text('post_id').notNull().references(() => posts.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userSettings = pgTable('user_settings', {
  userId: text('user_id').primaryKey().references(() => users.id),
  defaultAllowComments: boolean('default_allow_comments').default(true).notNull(),
  defaultAllowRemixes: boolean('default_allow_remixes').default(true).notNull(),
  theme: text('theme').default('github'),
  language: text('language').default('javascript'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
