import prisma from '../config/prisma.js';
import { NotFoundError } from '../types/index.js';
import { sanitizeHtml } from '../utils/sanitizeHtml.js';

export async function listPosts(filters: { published?: boolean; page?: number; limit?: number }) {
  const { published, page = 1, limit = 12 } = filters;
  const skip = (page - 1) * limit;
  const where: any = {};
  if (published !== undefined) where.published = published;

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.blogPost.count({ where }),
  ]);
  return { posts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getPostBySlug(slug: string, options: { publishedOnly?: boolean } = {}) {
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  // The public route reads by slug. Without this filter an unpublished draft was
  // readable by anyone who guessed its slug or was sent the link, which is how
  // an unapproved announcement reaches the open web.
  if (!post || (options.publishedOnly && !post.published)) throw new NotFoundError('Blog post');
  return post;
}

export async function getPostById(id: string) {
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) throw new NotFoundError('Blog post');
  return post;
}

export async function createPost(data: { title: string; slug: string; excerpt?: string; body: string; coverImage?: string; published?: boolean }) {
  // Sanitize at the write boundary so unsafe markup never reaches the database.
  return prisma.blogPost.create({ data: { ...data, body: sanitizeHtml(data.body) } });
}

export async function updatePost(id: string, data: Partial<{ title: string; slug: string; excerpt: string; body: string; coverImage: string; published: boolean }>) {
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) throw new NotFoundError('Blog post');
  // Only sanitize when a body is supplied, so a partial update cannot blank it.
  const patch = data.body === undefined ? data : { ...data, body: sanitizeHtml(data.body) };
  return prisma.blogPost.update({ where: { id }, data: patch });
}

export async function deletePost(id: string) {
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) throw new NotFoundError('Blog post');
  return prisma.blogPost.delete({ where: { id } });
}
