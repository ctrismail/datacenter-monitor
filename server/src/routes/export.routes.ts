import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as exportService from '../services/export.service';

const router = Router();

router.use(authMiddleware);

router.get('/checks', async (req, res) => {
  try {
    const filters = {
      equipmentId: req.query.equipment_id ? parseInt(req.query.equipment_id as string) : undefined,
      startDate: req.query.start as string | undefined,
      endDate: req.query.end as string | undefined,
    };
    const workbook = await exportService.exportChecks(filters);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=kontrol-kayitlari.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/report', async (req, res) => {
  try {
    const year = parseInt(req.query.year as string);
    const month = parseInt(req.query.month as string);
    if (!year || !month) {
      return res.status(400).json({ error: 'Yıl ve ay parametreleri gerekli' });
    }
    const workbook = await exportService.exportMonthlyReport(year, month);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=rapor-${year}-${month}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
