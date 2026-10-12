import type { Request, Response, NextFunction } from "express";
import {
  listBalancesQuerySchema,
  listMovementsQuerySchema,
  stockReceiptSchema,
  stockIssueSchema,
  stockTransferSchema,
  stockAdjustmentSchema,
  reverseMovementSchema,
} from "./stock.schemas.js";
import {
  findBalancesRepository,
  findMovementsPaginatedRepository,
} from "./stock.repository.js";
import {
  createReceiptService,
  createIssueService,
  createTransferService,
  createAdjustmentService,
  reverseMovementService,
} from "./stock.service.js";

function getStockContext(req: Request) {
  return {
    organizationId: req.tenant!.organizationId,
    userId: req.auth!.userId,
    requestId: req.requestId,
    negativeStockPolicy: req.tenant!.negativeStockPolicy,
  };
}

export async function listBalancesController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listBalancesQuerySchema.parse(req.query);
    const data = await findBalancesRepository(req.tenant!.organizationId, query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function listMovementsController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listMovementsQuerySchema.parse(req.query);
    const result = await findMovementsPaginatedRepository(req.tenant!.organizationId, query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createReceiptController(req: Request, res: Response, next: NextFunction) {
  try {
    const idempotencyHeader = req.header("Idempotency-Key");
    const payload = {
      ...req.body,
      idempotencyKey: req.body?.idempotencyKey || idempotencyHeader,
    };
    const parsed = stockReceiptSchema.parse(payload);
    const result = await createReceiptService(getStockContext(req), parsed);
    res.status(result.idempotentReplay ? 200 : 201).json({
      data: result.movement,
      idempotentReplay: result.idempotentReplay,
    });
  } catch (err) {
    next(err);
  }
}

export async function createIssueController(req: Request, res: Response, next: NextFunction) {
  try {
    const idempotencyHeader = req.header("Idempotency-Key");
    const payload = {
      ...req.body,
      idempotencyKey: req.body?.idempotencyKey || idempotencyHeader,
    };
    const parsed = stockIssueSchema.parse(payload);
    const result = await createIssueService(getStockContext(req), parsed);
    res.status(result.idempotentReplay ? 200 : 201).json({
      data: result.movement,
      idempotentReplay: result.idempotentReplay,
    });
  } catch (err) {
    next(err);
  }
}

export async function createTransferController(req: Request, res: Response, next: NextFunction) {
  try {
    const idempotencyHeader = req.header("Idempotency-Key");
    const payload = {
      ...req.body,
      idempotencyKey: req.body?.idempotencyKey || idempotencyHeader,
    };
    const parsed = stockTransferSchema.parse(payload);
    const result = await createTransferService(getStockContext(req), parsed);
    res.status(result.idempotentReplay ? 200 : 201).json({
      data: result.movement,
      idempotentReplay: result.idempotentReplay,
    });
  } catch (err) {
    next(err);
  }
}

export async function createAdjustmentController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const idempotencyHeader = req.header("Idempotency-Key");
    const payload = {
      ...req.body,
      idempotencyKey: req.body?.idempotencyKey || idempotencyHeader,
    };
    const parsed = stockAdjustmentSchema.parse(payload);
    const result = await createAdjustmentService(getStockContext(req), parsed);
    res.status(result.idempotentReplay ? 200 : 201).json({
      data: result.movement,
      idempotentReplay: result.idempotentReplay,
    });
  } catch (err) {
    next(err);
  }
}

export async function reverseMovementController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const idempotencyHeader = req.header("Idempotency-Key");
    const payload = {
      ...req.body,
      idempotencyKey: req.body?.idempotencyKey || idempotencyHeader,
    };
    const parsed = reverseMovementSchema.parse(payload);
    const result = await reverseMovementService(
      getStockContext(req),
      String(req.params.id),
      parsed
    );
    res.status(result.idempotentReplay ? 200 : 201).json({
      data: result.movement,
      idempotentReplay: result.idempotentReplay,
    });
  } catch (err) {
    next(err);
  }
}
