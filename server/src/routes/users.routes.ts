import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as usersService from '../services/users.service';

const router = Router();

router.use(authMiddleware);

router.get('/', async (_req, res) => {
  try {
    const users = await usersService.listUsers();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { username, displayName, password } = req.body;
    if (!username || !displayName || !password) {
      return res.status(400).json({ error: 'Tüm alanlar zorunlu' });
    }
    const user = await usersService.createUser(username, displayName, password);
    res.status(201).json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const user = await usersService.updateUser(parseInt(req.params.id), req.body);
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await usersService.deleteUser(parseInt(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
