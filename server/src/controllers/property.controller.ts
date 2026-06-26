import { Request, Response, NextFunction } from 'express';
import * as propertyService from '../services/property.service.js';
import * as reviewService from '../services/review.service.js';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type, minPrice, maxPrice, search, neighborhood, minBedrooms, minRating, available, featured, page, limit } = req.query;
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

/** Authenticated listing — returns only properties owned by the logged-in host/admin. */
export async function listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type, minPrice, maxPrice, search, available, featured, page, limit } = req.query;
    const result = await propertyService.listProperties({
      type: type as string | undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      search: search as string | undefined,
      available: available !== undefined ? available === 'true' : undefined,
      featured: featured !== undefined ? featured === 'true' : undefined,
      hostId: req.user!.sub,
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

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await propertyService.getProperty(req.params.id);
    res.json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await propertyService.createProperty({
      ...req.body,
      hostId: req.user!.sub,   // always record who created the property
    });
    res.status(201).json({ success: true, data: property });
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
