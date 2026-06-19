import { Router, Response } from 'express';
import multer from 'multer';
import cloudinary from '../lib/cloudinary';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', authenticate, upload.array('images', 10), async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files?.length) { res.status(400).json({ error: 'Aucun fichier reçu.' }); return; }

    const uploads = await Promise.all(files.map(file =>
      new Promise<string>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'soukmar/listings', transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }] },
          (err, result) => err ? reject(err) : resolve(result!.secure_url)
        ).end(file.buffer);
      })
    ));

    res.json({ urls: uploads });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors du téléchargement.' });
  }
});

export default router;
