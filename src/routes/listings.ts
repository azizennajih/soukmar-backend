import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Category, ListingStatus } from '@prisma/client';

const router = Router();

// GET /api/listings - public, filterable
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, city, q, minPrice, maxPrice, page = '1', limit = '20' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: Record<string, unknown> = { status: ListingStatus.ACTIVE };
    if (category) where['category'] = category as Category;
    if (city) where['city'] = { contains: city, mode: 'insensitive' };
    if (q) where['OR'] = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } }
    ];
    if (minPrice || maxPrice) {
      where['price'] = {};
      if (minPrice) (where['price'] as Record<string, number>)['gte'] = parseFloat(minPrice);
      if (maxPrice) (where['price'] as Record<string, number>)['lte'] = parseFloat(maxPrice);
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: [{ isFeatured: 'desc' }, { isPremium: 'desc' }, { createdAt: 'desc' }],
        include: { user: { select: { id: true, name: true, city: true } } }
      }),
      prisma.listing.count({ where })
    ]);

    res.json({ listings, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /api/listings/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params['id'] as string },
      include: { user: { select: { id: true, name: true, city: true, phone: true } } }
    });
    if (!listing) { res.status(404).json({ error: 'Annonce introuvable.' }); return; }
    await prisma.listing.update({ where: { id: listing.id }, data: { views: { increment: 1 } } });
    res.json(listing);
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /api/listings - authenticated
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, price, category, city, region, images, phone, whatsapp } = req.body;
    if (!title || !category || !city) { res.status(400).json({ error: 'Champs requis manquants.' }); return; }
    const listing = await prisma.listing.create({
      data: {
        title, description, price: price ? parseFloat(price) : null,
        category: category as Category, city, region,
        images: images || [], phone, whatsapp,
        userId: req.userId!
      }
    });
    res.status(201).json(listing);
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PUT /api/listings/:id - authenticated, owner only
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.listing.findUnique({ where: { id: req.params['id'] as string } });
    if (!existing) { res.status(404).json({ error: 'Annonce introuvable.' }); return; }
    if (existing.userId !== req.userId && req.userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Accès refusé.' }); return;
    }
    const listing = await prisma.listing.update({
      where: { id: req.params['id'] as string },
      data: req.body
    });
    res.json(listing);
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// DELETE /api/listings/:id - authenticated, owner or admin
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.listing.findUnique({ where: { id: req.params['id'] as string } });
    if (!existing) { res.status(404).json({ error: 'Annonce introuvable.' }); return; }
    if (existing.userId !== req.userId && req.userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Accès refusé.' }); return;
    }
    await prisma.listing.delete({ where: { id: req.params['id'] as string } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /api/listings/user/mine - my listings
router.get('/user/mine', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(listings);
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
