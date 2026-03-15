import { Request, Response } from 'express';
import { TranslationService } from '../services/translation.js';

export class TranslationController {
  static async translateHtmlFile(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No HTML file uploaded' });
      }

      const { mode, targetLanguage, apiKey, baseURL, modelName } = req.body;

      if (!apiKey) {
        return res.status(400).json({ error: 'API Key is required' });
      }

      const htmlContent = req.file.buffer.toString('utf-8');

      const translatedHtml = await TranslationService.translateHtml(htmlContent, {
        mode: mode || 'translated_only',
        targetLanguage: targetLanguage || 'Chinese',
        apiKey: apiKey,
        baseURL: baseURL || undefined,
        modelName: modelName || undefined,
      });

      // Send the translated HTML back
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="translated_${req.file.originalname}"`);
      res.send(translatedHtml);

    } catch (error: any) {
      console.error('Translation error:', error);
      res.status(500).json({ error: 'Translation failed', details: error.message });
    }
  }
}
