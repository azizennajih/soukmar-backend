import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, city } = req.body;
    if (!name || !email || !password) { res.status(400).json({ error: 'Champs requis manquants.' }); return; }
    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) { res.status(409).json({ error: 'Un compte avec cet email existe déjà.' }); return; }
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name: name.trim(), email: email.toLowerCase(), password: hashed, phone, city },
      select: { id: true, name: true, email: true, role: true, phone: true, city: true }
    });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env['JWT_SECRET']!, { expiresIn: '7d' });
    res.status(201).json({ user, token });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email?.toLowerCase() } });
    if (!user) { res.status(401).json({ error: 'Aucun compte trouvé avec cet email.' }); return; }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) { res.status(401).json({ error: 'Mot de passe incorrect.' }); return; }
    const token = jwt.sign({ id: user.id, role: user.role }, process.env['JWT_SECRET']!, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, role: true, phone: true, city: true, image: true, createdAt: true }
    });
    if (!user) { res.status(404).json({ error: 'Utilisateur introuvable.' }); return; }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
