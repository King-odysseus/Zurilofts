import { Request, Response, NextFunction } from "express";
import * as recommendationService from "../services/recommendation.service.js";

export async function getRecommendations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const recommendations =
      await recommendationService.getPersonalizedRecommendations(req.user!.sub);
    res.json({ success: true, data: recommendations });
  } catch (error) {
    next(error);
  }
}