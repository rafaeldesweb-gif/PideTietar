import React, { useEffect } from 'react';

interface SeoHeadProps {
  title?: string;
  description?: string;
  type?: 'website' | 'product' | 'business';
  image?: string;
  url?: string;
  businessName?: string;
  priceCents?: number;
}

/**
 * Componente de metaetiquetas SEO dinámico. Se coloca en cada vista para que
 * el <title>, description, Open Graph y JSON-LD se actualicen sin recargar la
 * página. No altera la lógica de navegación ni de negocio.
 */
export const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description,
  type = 'website',
  image,
  url,
  businessName,
  priceCents,
}) => {
  useEffect(() => {
    const baseUrl = 'https://pidetietar.es';
    const pageTitle = title
      ? `${title} · PideTiétar`
      : 'PideTiétar - Todo el valle a tu puerta';
    const pageDesc =
      description ||
      'Plataforma de delivery y comercio local en el Valle del Tiétar con gestión de pedidos, negocios, repartidores, pagos y sincronización.';
    const pageUrl = url ? `${baseUrl}${url}` : baseUrl;
    const pageImage = image || '/og-image.svg';

    // Actualizar <title>
    if (document.title !== pageTitle) {
      document.title = pageTitle;
    }

    // Actualizar o insertar meta tags
    const setMeta = (name: string, value: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    setMeta('description', pageDesc);
    setMeta('og:title', pageTitle, true);
    setMeta('og:description', pageDesc, true);
    setMeta('og:type', type, true);
    setMeta('og:url', pageUrl, true);
    setMeta('og:site_name', 'PideTiétar', true);
    setMeta('og:image', pageImage, true);
    setMeta('og:image:width', '1200', true);
    setMeta('og:image:height', '630', true);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', pageTitle);
    setMeta('twitter:description', pageDesc);
    setMeta('twitter:image', pageImage);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', pageUrl);

    // JSON-LD estructurado (sin duplicar si ya existe para esta entidad)
    const existingJsonLd = document.getElementById('seo-json-ld');
    if (existingJsonLd) existingJsonLd.remove();

    if (type === 'business' && businessName) {
      const ld = {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        'name': businessName,
        'url': pageUrl,
        'image': pageImage,
        'description': pageDesc,
        'telephone': '',
        'address': {
          '@type': 'PostalAddress',
          'addressLocality': 'Valle del Tiétar',
          'addressRegion': 'Ávila',
          'addressCountry': 'ES',
        },
      };
      const script = document.createElement('script');
      script.id = 'seo-json-ld';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(ld);
      document.head.appendChild(script);
    } else if (type === 'product' && businessName) {
      const ld = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        'name': title || '',
        'description': pageDesc,
        'image': pageImage,
        'url': pageUrl,
        'brand': {
          '@type': 'Brand',
          'name': businessName,
        },
        ...(priceCents !== undefined
          ? {
              'offers': {
                '@type': 'Offer',
                'price': (priceCents / 100).toFixed(2),
                'priceCurrency': 'EUR',
                'availability': 'https://schema.org/InStock',
              },
            }
          : {}),
      };
      const script = document.createElement('script');
      script.id = 'seo-json-ld';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(ld);
      document.head.appendChild(script);
    }
  }, [title, description, type, image, url, businessName, priceCents]);

  return null;
};
