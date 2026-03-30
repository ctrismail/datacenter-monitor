import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import * as checksService from '../services/checks.service';

const router = Router();

router.use(authMiddleware);

// Check Types
router.get('/types', async (_req, res) => {
  try {
    const types = await checksService.listCheckTypes();
    res.json(types);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/types', async (req, res) => {
  try {
    const type = await checksService.createCheckType(req.body.name, req.body.description);
    res.status(201).json(type);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Schedules
router.get('/schedules', async (req, res) => {
  try {
    const equipmentId = req.query.equipment_id ? parseInt(req.query.equipment_id as string) : undefined;
    const schedules = await checksService.listSchedules(equipmentId);
    res.json(schedules);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/schedules', async (req, res) => {
  try {
    const { equipmentId, checkTypeId, intervalHours } = req.body;
    const schedule = await checksService.createSchedule(equipmentId, checkTypeId, intervalHours);
    res.status(201).json(schedule);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/schedules/:id', async (req, res) => {
  try {
    const schedule = await checksService.updateSchedule(parseInt(req.params.id), req.body.intervalHours);
    res.json(schedule);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/schedules/:id', async (req, res) => {
  try {
    await checksService.deleteSchedule(parseInt(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Check Logs
router.get('/', async (req, res) => {
  try {
    const filters = {
      equipmentId: req.query.equipment_id ? parseInt(req.query.equipment_id as string) : undefined,
      userId: req.query.user_id ? parseInt(req.query.user_id as string) : undefined,
      startDate: req.query.start as string | undefined,
      endDate: req.query.end as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
    };
    const result = await checksService.listCheckLogs(filters);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const log = await checksService.getCheckLogWithFields(parseInt(req.params.id));
    res.json(log);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const log = await checksService.createCheckLog({
      ...req.body,
      userId: req.userId!,
    });
    res.status(201).json(log);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
