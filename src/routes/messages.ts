import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { receiverId, listingId, content } = req.body;
    if (!receiverId || !content) { res.status(400).json({ error: 'Champs requis manquants.' }); return; }
    const msg = await prisma.message.create({
      data: { senderId: req.userId!, receiverId, listingId, content }
    });
    res.status(201).json(msg);
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/inbox', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const messages = await prisma.message.findMany({
      where: { receiverId: req.userId },
      include: {
        sender: { select: { id: true, name: true } },
        listing: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(messages);
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.message.updateMany({
      where: { id: req.params['id'] as string, receiverId: req.userId },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
