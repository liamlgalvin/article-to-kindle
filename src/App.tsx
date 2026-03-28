import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, Download, Link as LinkIcon, Loader2, AlertCircle, CheckCircle2, Tablet } from "lucide-react";
import { generateEpub } from './lib/epubGenerator';
import DOMPurify from 'dompurify';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [status, setStatus] = useState('');
  const [htmlInput, setHtmlInput] = useState('');
  const bookmarkletRef = useRef<HTMLAnchorElement>(null);

  const getAmazonTld = () => {
    const lang = navigator.language.toLowerCase();
    if (lang.includes('es')) return 'es';
    if (lang.includes('fr')) return 'fr';
    if (lang.includes('de')) return 'de';
    if (lang.includes('it')) return 'it';
    if (lang.includes('jp')) return 'co.jp';
    if (lang.includes('gb')) return 'co.uk';
    if (lang.includes('ca')) return 'ca';
    if (lang.includes('au')) return 'com.au';
    if (lang.includes('br')) return 'com.br';
    if (lang.includes('mx')) return 'com.mx';
    if (lang.includes('in')) return 'in';
    return 'com';
  };

  const amazonUrl = `https://www.amazon.${getAmazonTld()}/sendtokindle`;

  const bookmarkletCode = `javascript:(function(){const article=document.querySelector('article')||document.querySelector('.post-content')||document.body;const html=article.outerHTML;const el=document.createElement('textarea');el.value=html;document.body.appendChild(el);el.select();document.execCommand('copy');document.body.removeChild(el);alert('Article HTML copied to clipboard! Redirecting to Article to Kindle...');window.open('${window.location.origin}');})();`;

  useEffect(() => {
    if (bookmarkletRef.current) {
      bookmarkletRef.current.setAttribute('href', bookmarkletCode);
    }
  }, []);

  const cleanArticleContent = (element: Element) => {
    const selectorsToRemove = [
      'script', 'style', 'img', 'iframe', 'video', 'audio', 'canvas', 'svg',
      '.post-footer', '.subscribe-widget', 
      '.share-dialog', '.button-wrapper', '.action-buttons',
      '.embedded-post-stats', '.comments-link', '.post-ufi',
      '.post-copyright', '.post-signature', '.subscription-widget-wrap'
    ];
    
    // Create a clone to avoid modifying the original DOM if needed
    const clone = element.cloneNode(true) as Element;
    
    selectorsToRemove.forEach(s => {
      clone.querySelectorAll(s).forEach(el => el.remove());
    });

    const cleanNode = DOMPurify.sanitize(clone, {
      RETURN_DOM: true,
      ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'br', 'hr', 'blockquote'],
      ALLOWED_ATTR: ['href', 'title']
    });

    // XMLSerializer ensures strict XHTML (e.g., <br /> instead of <br>)
    return new XMLSerializer().serializeToString(cleanNode);
  };

  const processDirectHtml = async (html: string) => {
    setStatus('Processing provided HTML...');
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Try to find an article tag, otherwise use the whole body
    const contentElement = doc.querySelector('article') || doc.body;
    
    const title = doc.querySelector('h1, title')?.textContent?.trim() || 'Untitled Article';
    const author = 'Unknown Author';
    const description = '';

    const cleanHtml = cleanArticleContent(contentElement);

    return { title, author, content: cleanHtml, description };
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!htmlInput) return;

    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const data = await processDirectHtml(htmlInput);
      
      setStatus('Generating EPUB file...');
      await generateEpub({
        title: data.title,
        author: data.author,
        content: data.content,
        description: data.description
      });

      setSuccess(true);
      setStatus('Conversion complete!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-serif selection:bg-[#FF6321] selection:text-white">
      {/* Header */}
      <header className="border-b border-[#1A1A1A]/10 py-6 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#FF6321] rounded-full flex items-center justify-center text-white">
              <BookOpen size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight uppercase font-sans">Article to Kindle</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-7xl font-light leading-tight mb-6">
            Read your favorite Articles on Kindle.
          </h2>
          <p className="text-lg text-[#1A1A1A]/60 max-w-xl mx-auto leading-relaxed">
            Paste raw HTML code directly. We'll clean it and format it for your Kindle.
          </p>
        </motion.div>

        <form onSubmit={handleConvert} className="relative group">
          <div className="space-y-4">
            <textarea
              value={htmlInput}
              onChange={(e) => setHtmlInput(e.target.value)}
              placeholder="Paste your HTML code here (e.g. <article>...</article>)"
              className="w-full h-64 bg-white border-2 border-[#1A1A1A] rounded-2xl p-6 text-lg focus:outline-none focus:ring-4 focus:ring-[#FF6321]/10 transition-all placeholder:text-[#1A1A1A]/20 font-mono text-sm"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF6321] text-white py-6 rounded-2xl font-sans font-bold uppercase tracking-wider hover:bg-[#E5591E] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  Processing HTML
                </>
              ) : (
                <>
                  Convert to Ebook
                  <Download size={24} />
                </>
              )}
            </button>
          </div>
        </form>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 flex items-center justify-center gap-3 text-[#1A1A1A]/60 font-sans text-sm font-medium uppercase tracking-widest"
            >
              <LinkIcon size={16} className="text-[#FF6321]" />
              {status}
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mt-8 p-6 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-4 text-red-900"
            >
              <AlertCircle className="shrink-0 mt-1" size={20} />
              <div>
                <h4 className="font-bold font-sans uppercase text-xs tracking-wider mb-1">Conversion Failed</h4>
                <p className="text-sm opacity-80">{error}</p>
              </div>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mt-8 p-6 bg-green-50 border border-green-100 rounded-2xl flex items-start gap-4 text-green-900"
            >
              <CheckCircle2 className="shrink-0 mt-1" size={20} />
              <div className="flex-1">
                <h4 className="font-bold font-sans uppercase text-xs tracking-wider mb-1">Success</h4>
                <p className="text-sm opacity-80 mb-4">Your EPUB has been generated and download should start automatically.</p>
                
                <div className="flex flex-wrap gap-3">
                  <a 
                    href={amazonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#FF6321] text-white px-4 py-2 rounded-lg font-sans font-bold uppercase text-[10px] tracking-widest hover:bg-[#E5591E] transition-all"
                  >
                    <Tablet size={14} />
                    Send to Kindle
                  </a>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-[#1A1A1A]/10 pt-12">
          <div>
            <h3 className="font-sans font-bold uppercase text-[10px] tracking-[0.2em] mb-4 opacity-40">01. Paste</h3>
            <p className="text-sm leading-relaxed opacity-70">
              Takes your provided HTML code directly, cleans it, and prepares it for conversion.
            </p>
          </div>
          <div>
            <h3 className="font-sans font-bold uppercase text-[10px] tracking-[0.2em] mb-4 opacity-40">02. Package</h3>
            <p className="text-sm leading-relaxed opacity-70">The content is bundled into a standard EPUB 3.0 file with proper metadata, table of contents, and styling.</p>
          </div>
          <div>
            <h3 className="font-sans font-bold uppercase text-[10px] tracking-[0.2em] mb-4 opacity-40">03. Read</h3>
            <p className="text-sm leading-relaxed opacity-70">Simply use the "Send to Kindle" service or transfer the file via USB to enjoy your reading on any device.</p>
          </div>
        </section>

        <section className="mt-20 p-8 bg-[#1A1A1A] text-white rounded-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#FF6321] rounded-full flex items-center justify-center">
              <LinkIcon size={16} />
            </div>
            <h3 className="font-sans font-bold uppercase text-xs tracking-widest">The "Easy Way" Bookmarklet</h3>
          </div>
          <p className="text-sm text-white/60 mb-8 leading-relaxed">
            Drag the button below to your browser's bookmarks bar. When you're on an article page, click it to automatically copy the article content and return here.
          </p>
          <a 
            ref={bookmarkletRef}
            className="inline-block bg-white text-[#1A1A1A] px-6 py-3 rounded-xl font-sans font-bold uppercase text-[10px] tracking-widest hover:bg-[#FF6321] hover:text-white transition-all cursor-move"
            onClick={(e) => e.preventDefault()}
          >
            Drag to Bookmarks: Kindle This
          </a>
          <div className="mt-6 flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-widest text-white/30">
            <AlertCircle size={12} />
            <span>Works on almost any site</span>
          </div>
        </section>
      </main>

      <footer className="max-w-3xl mx-auto px-4 py-12 border-t border-[#1A1A1A]/10 text-center opacity-30 text-[10px] font-sans font-bold uppercase tracking-[0.3em]">
        Built for GitHub Pages & Kindle
      </footer>
    </div>
  );
}
