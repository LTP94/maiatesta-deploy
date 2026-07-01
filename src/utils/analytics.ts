declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

export type AnalyticsEvent = {
  event: string;
  page_path?: string;
  page_title?: string;
  cta_location?: string;
  cta_label?: string;
  service_slug?: string;
  service_selected?: string;
  destination_url?: string;
};

export function pushEvent(payload: AnalyticsEvent): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload as Record<string, unknown>);
}

export function trackWhatsAppClick(params: {
  ctaLocation: string;
  pageSlug?: string;
  pageType?: string;
}): void {
  pushEvent({
    event: 'whatsapp_click',
    page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    cta_location: params.ctaLocation,
    service_slug: params.pageSlug,
  });
}

export function trackEmailClick(ctaLocation: string): void {
  pushEvent({
    event: 'email_click',
    page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    cta_location: ctaLocation,
  });
}

export function trackPhoneClick(ctaLocation: string): void {
  pushEvent({
    event: 'phone_click',
    page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    cta_location: ctaLocation,
  });
}

export function trackContactFormSubmit(params: {
  serviceSelected?: string;
}): void {
  pushEvent({
    event: 'contact_form_submit',
    page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    service_selected: params.serviceSelected,
  });
}

export function trackPrimaryCtaClick(params: {
  ctaLabel: string;
  ctaLocation: string;
}): void {
  pushEvent({
    event: 'primary_cta_click',
    page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    cta_label: params.ctaLabel,
    cta_location: params.ctaLocation,
  });
}
