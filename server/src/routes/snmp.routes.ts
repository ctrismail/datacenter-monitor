import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as snmpService from '../services/snmp.service';

const router = Router();
router.use(authMiddleware);

// Cihazlar
router.get('/devices', async (_req, res) => {
  try { res.json(await snmpService.listSnmpDevices()); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/devices/:id', async (req, res) => {
  try { res.json(await snmpService.getSnmpDevice(parseInt(req.params.id))); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/devices', async (req, res) => {
  try {
    const device = await snmpService.createSnmpDevice({
      equipmentId: req.body.equipmentId,
      ipAddress: req.body.ipAddress,
      port: req.body.port,
      snmpVersion: req.body.snmpVersion,
      community: req.body.community,
      pollInterval: req.body.pollInterval,
    });
    // Polling'e ekle
    await snmpService.addDeviceToPolling(device.id);
    res.status(201).json(device);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/devices/:id', async (req, res) => {
  try {
    const device = await snmpService.updateSnmpDevice(parseInt(req.params.id), {
      ipAddress: req.body.ipAddress,
      port: req.body.port,
      snmpVersion: req.body.snmpVersion,
      community: req.body.community,
      pollInterval: req.body.pollInterval,
      isActive: req.body.isActive,
    });
    res.json(device);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/devices/:id', async (req, res) => {
  try {
    await snmpService.deleteSnmpDevice(parseInt(req.params.id));
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// OID Mappings
router.get('/devices/:id/oids', async (req, res) => {
  try { res.json(await snmpService.getOidMappings(parseInt(req.params.id))); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Live Readings
router.get('/devices/:id/readings', async (req, res) => {
  try { res.json(await snmpService.getLatestReadings(parseInt(req.params.id))); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/devices/:id/readings/:oidId/history', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    res.json(await snmpService.getReadingHistory(parseInt(req.params.id), parseInt(req.params.oidId), hours));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Tüm cihazların son verileri (dashboard)
router.get('/live', async (_req, res) => {
  try { res.json(await snmpService.getAllLatestReadings()); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Alarmlar
router.get('/alarms', async (req, res) => {
  try {
    const onlyActive = req.query.all !== 'true';
    res.json(await snmpService.getAlarms(onlyActive));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/alarms/:id/acknowledge', async (req, res) => {
  try {
    const alarm = await snmpService.acknowledgeAlarm(parseInt(req.params.id), (req as any).user.id);
    res.json(alarm);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Polling kontrolü
router.post('/polling/start', async (_req, res) => {
  try { await snmpService.startPolling(); res.json({ status: 'started' }); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/polling/stop', async (_req, res) => {
  try { await snmpService.stopPolling(); res.json({ status: 'stopped' }); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
