import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const favs = await prisma.favorite.findMany({
      where: { userId: req.userId },
      include: { listing: { include: { user: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(favs.map(f => f.listing));
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/:listingId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const fav = await prisma.favorite.create({
      data: { userId: req.userId!, listingId: req.params['listingId'] as string }
    });
    res.status(201).json(fav);
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') { res.status(409).json({ error: 'Déjà en favoris.' }); return; }
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.delete('/:listingId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.favorite.deleteMany({
      where: { userId: req.userId, listingId: req.params['listingId'] as string }
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
