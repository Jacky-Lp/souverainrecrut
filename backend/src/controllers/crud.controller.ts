import { Request, Response } from "express";

import { asyncHandler } from "../utils/async-handler";
import {
  buildPaginationMeta,
  getPagination,
} from "../utils/pagination";

/**
 * Contrat minimal attendu d'un service CRUD.
 */
export interface CrudService {
  getAll(
    skip?: number,
    take?: number
  ): Promise<{ items: unknown[]; total: number }>;
  getById(id: string): Promise<unknown>;
  create(data: any): Promise<unknown>;
  update(id: string, data: any): Promise<unknown>;
  delete(id: string): Promise<unknown>;
}

/**
 * Contrôleur CRUD générique partagé par les ressources.
 */
export class CrudController {
  constructor(private readonly service: CrudService) {}

  /**
   * GET /resources — liste paginée.
   */
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip } = getPagination(
      req.query.page as string,
      req.query.limit as string
    );

    const result = await this.service.getAll(skip, limit);

    res.status(200).json({
      success: true,
      data: result.items,
      pagination: buildPaginationMeta(page, limit, result.total),
    });
  });

  /**
   * GET /resources/:id
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getById(String(req.params.id));

    res.status(200).json({ success: true, data });
  });

  /**
   * POST /resources
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.create(req.body);

    res.status(201).json({ success: true, data });
  });

  /**
   * PUT /resources/:id
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.update(
      String(req.params.id),
      req.body
    );

    res.status(200).json({ success: true, data });
  });

  /**
   * DELETE /resources/:id
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.delete(String(req.params.id));

    res.status(200).json({ success: true, data });
  });
}
