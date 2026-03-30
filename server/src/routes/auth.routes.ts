import { Router, Response } from 'express';
import { login, getMe, generateTVToken } from '../services/auth.service';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
    }
    const result = await login(username, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await getMe(req.userId!);
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tv-token', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const token = await generateTVToken(req.userId!);
    res.json({ token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
