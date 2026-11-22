import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../shared/middleware/auth.js";
import { requirePermission } from "../../shared/middleware/permissions.js";
import { validate } from "../../shared/middleware/validate.js";
import * as service from "./roles.service.js";
import { roleSchema, roleUpdateSchema } from "./roles.schemas.js";

const router = Router();
const idParam = z.object({ id: z.string().uuid() });
router.use(authenticate, requirePermission("roles.view"));
router.get("/permissions", (_req, res) => res.json({ data: service.permissions() }));
router.get("/", async (_req, res, next) => { try { res.json({ data: await service.list() }); } catch (e) { next(e); } });
router.post("/", requirePermission("roles.manage"), validate({ body: roleSchema }), async (req, res, next) => { try { res.status(201).json({ data: await service.create(req.body) }); } catch (e) { next(e); } });
router.patch("/:id", requirePermission("roles.manage"), validate({ params: idParam, body: roleUpdateSchema }), async (req, res, next) => { try { res.json({ data: await service.update(req.params.id as string, req.body) }); } catch (e) { next(e); } });
router.delete("/:id", requirePermission("roles.manage"), validate({ params: idParam }), async (req, res, next) => { try { await service.remove(req.params.id as string); res.status(204).send(); } catch (e) { next(e); } });
export default router;
