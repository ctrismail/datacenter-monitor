import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as equipmentService from '../services/equipment.service';

const router = Router();

router.use(authMiddleware);

// Categories
router.get('/categories', async (_req, res) => {
  try {
    const categories = await equipmentService.listCategories();
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const category = await equipmentService.createCategory(req.body.name, req.body.icon);
    res.status(201).json(category);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const category = await equipmentService.updateCategory(parseInt(req.params.id), req.body.name, req.body.icon);
    res.json(category);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    await equipmentService.deleteCategory(parseInt(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Equipment
router.get('/', async (req, res) => {
  try {
    const categoryId = req.query.category_id ? parseInt(req.query.category_id as string) : undefined;
    const equipment = await equipmentService.listEquipment(categoryId);
    res.json(equipment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const equipment = await equipmentService.getEquipment(parseInt(req.params.id));
    if (!equipment) return res.status(404).json({ error: 'Ekipman bulunamadı' });
    res.json(equipment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const equipment = await equipmentService.createEquipment(req.body);
    res.status(201).json(equipment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const equipment = await equipmentService.updateEquipment(parseInt(req.params.id), req.body);
    res.json(equipment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await equipmentService.deleteEquipment(parseInt(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Field definitions for a category
router.get('/categories/:id/fields', async (req, res) => {
  try {
    const fields = await equipmentService.getFieldDefinitions(parseInt(req.params.id));
    res.json(fields);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
