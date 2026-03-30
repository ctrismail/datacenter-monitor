import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as dashboardService from '../services/dashboard.service';

const router = Router();

router.use(authMiddleware);

router.get('/summary', async (_req, res) => {
  try {
    const summary = await dashboardService.getDashboardSummary();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/statuses', async (_req, res) => {
  try {
    const statuses = await dashboardService.getEquipmentStatuses();
    res.json(statuses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/alerts', async (_req, res) => {
  try {
    const alerts = await dashboardService.getAlerts();
    res.json(alerts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/chart-data/:equipmentId', async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const data = await dashboardService.getChartData(parseInt(req.params.equipmentId), days);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/recent', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const data = await dashboardService.getRecentChecks(limit);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
