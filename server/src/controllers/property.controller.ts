import { Request, Response, NextFunction } from 'express';
import * as propertyService from '../services/property.service.js';
import * as reviewService from '../services/review.service.js';
import { verifyAccessToken } from '../utils/jwt.js';

// Best-effort auth for routes reachable both anonymously and signed-in
// (public property detail). Never throws - an invalid/missing token is
// treated as anonymous, matching the same route's public behavior.
function getSoftUser(req: Request): { sub: string; role: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = verifyAccessToken(authHeader.split(' ')[1]);
    return { sub: decoded.sub, role: decoded.role };
  } catch {
    return null;
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type, minPrice, maxPrice, search, neighborhood, minBedrooms, minRating, available, featured, status, page, limit } = req.query;
    // Only the admin listing queue (mounted behind requireAdmin) may see every
    // lifecycle status and filter by one; the public route always sees PUBLISHED only.
    const isAdmin = req.user?.role === 'ADMIN';
    const result = await propertyService.listProperties({
      type: type as string | undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      search: search as string | undefined,
      neighborhood: neighborhood as string | undefined,
      minBedrooms: minBedrooms ? Number(minBedrooms) : undefined,
      minRating: minRating ? Number(minRating) : undefined,
      available: available !== undefined ? available === 'true' : undefined,
      featured: featured !== undefined ? featured === 'true' : undefined,
      status: isAdmin && typeof status === 'string' ? (status as any) : undefined,
      includeAllStatuses: isAdmin,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 12,
    });

    res.json({
      success: true,
      data: result.properties,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/** Authenticated listing - returns only properties owned by the logged-in host/admin.
 *  Admins may pass ?hostId= to view another host's properties. */
export async function listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type, minPrice, maxPrice, search, available, featured, status, page, limit, hostId } = req.query;
    // Admins may optionally scope to another host; everyone else is scoped to self.
    const effectiveHostId = req.user!.role === 'ADMIN' && typeof hostId === 'string' && hostId
      ? hostId
      : req.user!.sub;
    const result = await propertyService.listProperties({
      type: type as string | undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      search: search as string | undefined,
      available: available !== undefined ? available === 'true' : undefined,
      featured: featured !== undefined ? featured === 'true' : undefined,
      status: typeof status === 'string' ? (status as any) : undefined,
      hostId: effectiveHostId,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 12,
    });

    res.json({
      success: true,
      data: result.properties,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}
export async function getSimilar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const similar = await propertyService.getSimilarProperties(req.params.id);
    res.json({ success: true, data: similar });
  } catch (error) {
    next(error);
  }
}



export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await propertyService.getProperty(req.params.id, getSoftUser(req));
    res.json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Every new listing is created as a private DRAFT regardless of any
    // status the caller sent - see property.service.buildCreateData.
    const property = await propertyService.createProperty({
      ...req.body,
      hostId: req.user!.sub,   // always record who created the property
    });
    res.status(201).json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
}

// Host submits their own DRAFT/REJECTED listing for admin review. Requires an
// APPROVED host account (enforced in the service) - dashboard/draft access
// alone is not enough to go live.
export async function submitForReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await propertyService.submitPropertyForReview(req.params.id, req.user!.sub);
    res.json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
}

// Admin: approve/reject a pending listing, or suspend/unsuspend a published one.
export async function adminReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { action, note } = req.body;
    const property = await propertyService.adminReviewProperty(req.params.id, req.user!.sub, action, note);
    res.json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Admins may edit any property; hosts are scoped to their own (404 otherwise).
    const ownerId = req.user!.role === 'ADMIN' ? undefined : req.user!.sub;
    const property = await propertyService.updateProperty(req.params.id, req.body, ownerId);
    res.json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
}

export async function bulk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const idsParam = req.query.ids as string | undefined;
    const ids = idsParam ? idsParam.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const properties = await propertyService.getPropertiesByIds(ids);
    res.json({ success: true, data: properties });
  } catch (error) {
    next(error);
  }
}

export async function getReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const reviews = await reviewService.getPropertyReviews(req.params.id);
    res.json({ success: true, data: reviews });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Admins may delete any property; hosts are scoped to their own (404 otherwise).
    const ownerId = req.user!.role === 'ADMIN' ? undefined : req.user!.sub;
    await propertyService.deleteProperty(req.params.id, ownerId);
    res.json({ success: true, message: 'Property deleted' });
  } catch (error) {
    next(error);
  }
}
