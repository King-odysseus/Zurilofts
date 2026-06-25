import { Request, Response, NextFunction } from 'express';
import * as blogService from '../services/blog.service.js';

// Public: list published posts
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = req.query;
    const result = await blogService.listPosts({
      published: true,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 12,
    });
    res.json({ success: true, data: result.posts, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

// Public: get single post by slug
export async function getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const post = await blogService.getPostBySlug(req.params.slug);
    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
}

// Admin: list all posts (including drafts)
export async function adminList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = req.query;
    const result = await blogService.listPosts({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    res.json({ success: true, data: result.posts, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

// Admin: get single post by id
export async function adminGet(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const post = await blogService.getPostById(req.params.id);
    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
}

// Admin: create post
export async function adminCreate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const post = await blogService.createPost(req.body);
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
}

// Admin: update post
export async function adminUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const post = await blogService.updatePost(req.params.id, req.body);
    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
}

// Admin: delete post
export async function adminDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await blogService.deletePost(req.params.id);
    res.json({ success: true, message: 'Blog post deleted' });
  } catch (error) {
    next(error);
  }
}
