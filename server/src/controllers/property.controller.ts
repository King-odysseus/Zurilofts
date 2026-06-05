import { Request, Response, NextFunction } from 'express';
import * as propertyService from '../services/property.service.js';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type, minPrice, maxPrice, search, available, featured, page, limit } = req.query;
    const result = await propertyService.listProperties({
      type: type as string | undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      search: search as string | undefined,
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
    const property = await propertyService.createProperty(req.body);
    res.status(201).json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await propertyService.updateProperty(req.params.id, req.body);
    res.json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await propertyService.deleteProperty(req.params.id);
    res.json({ success: true, message: 'Property deleted' });
  } catch (error) {
    next(error);
  }
}
