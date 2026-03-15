import * as cheerio from 'cheerio';
import OpenAI from 'openai';

interface TranslationOptions {
  mode: 'translated_only' | 'bilingual';
  targetLanguage: string;
  apiKey: string;
  baseURL?: string;
  modelName?: string;
}

interface TextNode {
  id: string;
  text: string;
  node: cheerio.Element;
}

export class TranslationService {
  private static readonly BATCH_SIZE = 50; // Translate 50 nodes at a time

  static async translateHtml(htmlContent: string, options: TranslationOptions): Promise<string> {
    const $ = cheerio.load(htmlContent);
    const textNodesToTranslate: TextNode[] = [];
    
    // 1. Extract valid text nodes
    $('*').each((_, element) => {
      // Skip script, style, and noscript tags, and elements with 'notranslate' class
      const tagName = element.tagName?.toLowerCase();
      if (['script', 'style', 'noscript', 'code', 'pre'].includes(tagName)) return;
      if ($(element).closest('.notranslate').length > 0) return;

      // Extract text directly within this element (not in children)
      $(element).contents().each((_, child) => {
        if (child.type === 'text') {
          const text = $(child).text().trim();
          if (text.length > 0) {
            // Check if it contains actual letters/words, not just punctuation
            if (/[a-zA-Z\u4e00-\u9fa5]/.test(text)) {
              textNodesToTranslate.push({
                id: `node_${textNodesToTranslate.length}`,
                text: text,
                node: child,
              });
            }
          }
        }
      });
      
      // Also extract common attributes that need translation
      const titleAttr = $(element).attr('title');
      if (titleAttr && titleAttr.trim().length > 0) {
         // for simplicity in this MVP, we only do inner text, but we can expand to attributes
      }
    });

    if (textNodesToTranslate.length === 0) {
      return htmlContent; // Nothing to translate
    }

    // 2. Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseURL || 'https://api.openai.com/v1',
    });
    
    const modelName = options.modelName || 'gpt-3.5-turbo';

    // 3. Batch translation
    const batches: TextNode[][] = [];
    for (let i = 0; i < textNodesToTranslate.length; i += this.BATCH_SIZE) {
      batches.push(textNodesToTranslate.slice(i, i + this.BATCH_SIZE));
    }

    for (const batch of batches) {
      const payload = batch.map(n => ({ id: n.id, text: n.text }));
      
      const systemPrompt = `You are a professional website localization engine. 
Translate the provided JSON array of texts into ${options.targetLanguage}.
CRITICAL RULES:
1. Do NOT translate proper nouns like Person Names, Brand Names, or technical terms, keep them in original language or standard transliteration.
2. Return a valid JSON array matching the exact structure: [{"id": "...", "translatedText": "..."}].
3. Only output JSON, no markdown formatting like \`\`\`json.`;

      const userPrompt = JSON.stringify(payload);

      // --- MOCK LOGIC FOR TESTING ---
      if (options.apiKey === 'mock') {
        const mockedData = batch.map(n => ({
          id: n.id,
          // Simulate keeping proper nouns by just prepending [Mock]
          translatedText: n.text.includes('ByteDance') || n.text.includes('Trae') 
            ? `[Mock翻译] ${n.text}` 
            : `[Mock翻译] ${n.text} (Translated)`
        }));
        
        for (const item of mockedData) {
          const originalNode = batch.find(n => n.id === item.id);
          if (originalNode) {
            if (options.mode === 'bilingual') {
               $(originalNode.node).replaceWith(`<span class="trae-original-text">${originalNode.text}</span><br class="trae-br"/><span class="trae-translated-text" style="color: #666; font-size: 0.9em;">${item.translatedText}</span>`);
            } else {
               $(originalNode.node).replaceWith(item.translatedText);
            }
          }
        }
        continue;
      }
      // ------------------------------

      try {
        const response = await openai.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' } // Request JSON mode if supported
        });

        const resultContent = response.choices[0].message.content || '{"translations": []}';
        // Handle cases where the LLM wraps it in an object like {"translations": [...]}
        let translatedData: any;
        try {
           const parsed = JSON.parse(resultContent);
           translatedData = Array.isArray(parsed) ? parsed : (parsed.translations || parsed);
           if (!Array.isArray(translatedData)) {
             translatedData = Object.values(parsed);
           }
        } catch(e) {
           console.error('Failed to parse JSON response:', resultContent);
           continue;
        }

        // 4. Inject translations back
        for (const item of translatedData) {
          if (!item || !item.id || !item.translatedText) continue;
          
          const originalNode = batch.find(n => n.id === item.id);
          if (originalNode) {
            if (options.mode === 'bilingual') {
               // Wrap original and translated in spans for bilingual display
               const parent = $(originalNode.node).parent();
               // Replace the text node with HTML
               $(originalNode.node).replaceWith(`<span class="trae-original-text">${originalNode.text}</span><br class="trae-br"/><span class="trae-translated-text" style="color: #666; font-size: 0.9em;">${item.translatedText}</span>`);
            } else {
               $(originalNode.node).replaceWith(item.translatedText);
            }
          }
        }
      } catch (error: any) {
        console.error('Translation batch failed:', error);
        
        // Enhance error logging to help user debug
        console.error(`[API Config] BaseURL: ${options.baseURL || 'Default'}, Model: ${modelName}`);

        if (error.status === 401) {
          console.error('API Key Error: Invalid API Key provided.');
        } else if (error.status === 404) {
          console.error('Model Error: The model does not exist or you do not have access to it.');
        } else if (error.status === 429) {
          console.error('Rate Limit: You have hit the rate limit.');
        }
        
        // Continue with other batches even if one fails
      }
    }

    // 5. Add minimal CSS if bilingual
    if (options.mode === 'bilingual') {
       $('head').append(`<style>
         .trae-original-text { font-weight: inherit; }
         .trae-translated-text { color: #555; display: inline-block; margin-top: 2px; }
       </style>`);
    }

    return $.html();
  }
}
