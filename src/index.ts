import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import listingRoutes from './routes/listings';
import messageRoutes from './routes/messages';
import favoriteRoutes from './routes/favorites';
import uploadRoutes from './routes/upload';

const app = express();
const PORT = process.env['PORT'] || 3000;

app.use(cors({ origin: ['http://localhost:4200', 'http://localhost:4201'], credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`SoukMar API running on port ${PORT}`));
