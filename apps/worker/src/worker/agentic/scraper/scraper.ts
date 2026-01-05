
import axios from 'axios';
import * as cheerio from 'cheerio';

interface DesignTokens {
  colors: string[];
  fonts: string[];
  layout: string[];
  title: string;
}

async function scrapeDesignTokens(url: string): Promise<DesignTokens> {
  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DesignScraper/1.0)' }
    });
    
    const $ = cheerio.load(data);
    const tokens: DesignTokens = {
      colors: [],
      fonts: [],
      layout: [],
      title: $('title').text().trim() || 'Unknown Site'
    };

    // 1. Extract Colors (Hex/RGB from style attributes and content)
    const htmlContent = $.html();
    const hexPattern = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;
    const colors = new Set<string>();
    
    let match;
    while ((match = hexPattern.exec(htmlContent)) !== null) {
      colors.add(match[0].toLowerCase());
    }
    
    // Simple heiristic: keep most frequent or just first 10 unique
    tokens.colors = Array.from(colors).slice(0, 10);

    // 2. Extract Fonts (font-family)
    const fontPattern = /font-family:\s*([^;"]+)/g;
    const fonts = new Set<string>();
    while ((match = fontPattern.exec(htmlContent)) !== null) {
      fonts.add(match[1].trim());
    }
    tokens.fonts = Array.from(fonts).slice(0, 5);

    // 3. Layout Patterns (Classes)
    // specific to common frameworks or generic naming
    const layoutKeywords = ['nav', 'header', 'footer', 'sidebar', 'grid', 'flex', 'container'];
    const foundLayouts = new Set<string>();
    
    $('*').each((_, el) => {
      const cls = $(el).attr('class');
      if (cls) {
        layoutKeywords.forEach(k => {
          if (cls.includes(k)) foundLayouts.add(k);
        });
      }
    });
    tokens.layout = Array.from(foundLayouts);

    return tokens;

  } catch (error) {
    if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch URL: ${error.message}`);
    }
    throw error;
  }
}

// CLI Interface
const url = process.argv[2];
if (!url) {
  console.error(JSON.stringify({ error: "No URL provided" }));
  process.exit(1);
}

scrapeDesignTokens(url)
  .then(tokens => console.log(JSON.stringify(tokens, null, 2)))
  .catch(err => {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  });
