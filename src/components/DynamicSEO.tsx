import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SEOData {
  title: string | null;
  description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  robots_index: boolean;
  robots_follow: boolean;
  json_ld: Record<string, unknown> | null;
  custom_head_tags: string | null;
}

const MANAGED_TAGS = ['meta[data-seo]', 'link[data-seo]', 'script[data-seo]'];

const setOrCreateMeta = (attr: string, value: string, nameAttr = 'name') => {
  let el = document.querySelector(`meta[${nameAttr}="${attr}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(nameAttr, attr);
    el.setAttribute('data-seo', 'true');
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
};

const DynamicSEO = () => {
  const { data } = useQuery<SEOData>({
    queryKey: ['seo-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-seo-settings');
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (!data) return;

    // Title
    if (data.title) document.title = data.title;

    // Meta description
    if (data.description) setOrCreateMeta('description', data.description);

    // Robots
    const robotsDirectives = [
      data.robots_index ? 'index' : 'noindex',
      data.robots_follow ? 'follow' : 'nofollow',
    ].join(', ');
    setOrCreateMeta('robots', robotsDirectives);

    // Open Graph
    if (data.og_title) setOrCreateMeta('og:title', data.og_title, 'property');
    if (data.og_description) setOrCreateMeta('og:description', data.og_description, 'property');
    if (data.og_image_url) setOrCreateMeta('og:image', data.og_image_url, 'property');
    setOrCreateMeta('og:type', 'website', 'property');

    // Twitter Card
    setOrCreateMeta('twitter:card', 'summary_large_image');
    if (data.og_title) setOrCreateMeta('twitter:title', data.og_title);
    if (data.og_description) setOrCreateMeta('twitter:description', data.og_description);
    if (data.og_image_url) setOrCreateMeta('twitter:image', data.og_image_url);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (data.canonical_url) {
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        canonical.setAttribute('data-seo', 'true');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', data.canonical_url);
    }

    // JSON-LD
    let jsonLdScript = document.querySelector('script[data-seo="jsonld"]') as HTMLScriptElement | null;
    if (data.json_ld) {
      if (!jsonLdScript) {
        jsonLdScript = document.createElement('script');
        jsonLdScript.type = 'application/ld+json';
        jsonLdScript.setAttribute('data-seo', 'jsonld');
        document.head.appendChild(jsonLdScript);
      }
      jsonLdScript.textContent = JSON.stringify(data.json_ld);
    }

    // Custom head tags
    const existingCustom = document.querySelectorAll('[data-seo="custom"]');
    existingCustom.forEach(el => el.remove());

    if (data.custom_head_tags) {
      const temp = document.createElement('div');
      temp.innerHTML = data.custom_head_tags;
      Array.from(temp.children).forEach(child => {
        (child as HTMLElement).setAttribute('data-seo', 'custom');
        document.head.appendChild(child);
      });
    }
  }, [data]);

  return null;
};

export default DynamicSEO;
