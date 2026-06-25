import prisma from '../config/prisma.js';
import { NotFoundError } from '../types/index.js';

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

export async function getPostBySlug(slug: string) {
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post) throw new NotFoundError('Blog post');
  return post;
}

export async function getPostById(id: string) {
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) throw new NotFoundError('Blog post');
  return post;
}

export async function createPost(data: { title: string; slug: string; excerpt?: string; body: string; coverImage?: string; published?: boolean }) {
  return prisma.blogPost.create({ data });
}

export async function updatePost(id: string, data: Partial<{ title: string; slug: string; excerpt: string; body: string; coverImage: string; published: boolean }>) {
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) throw new NotFoundError('Blog post');
  return prisma.blogPost.update({ where: { id }, data });
}

export async function deletePost(id: string) {
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) throw new NotFoundError('Blog post');
  return prisma.blogPost.delete({ where: { id } });
}
