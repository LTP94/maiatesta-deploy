import type { LocalizedContent } from '../data/siteContent';

type StickyWhatsAppButtonProps = {
  content: LocalizedContent;
};

export function StickyWhatsAppButton({ content }: StickyWhatsAppButtonProps) {
  const whatsappChannel = content.contact.channels.find(
    (channel) => channel.label.toLowerCase() === 'whatsapp',
  );
  const service =
    content.products.find((product) => product.id === 'ai-automation')?.title ??
    'chatbot de WhatsApp';
  const text = encodeURIComponent(
    `Hola Maiatesta, vi su web y me interesa automatizar ${service} en mi empresa en Quito.`,
  );

  return (
    <a
      className='sticky-whatsapp-button'
      href={`${whatsappChannel?.href ?? 'https://wa.me/593963092859'}?text=${text}`}
      target='_blank'
      rel='noreferrer'
      aria-label='Cotizar por WhatsApp'
    >
      <svg aria-hidden='true' viewBox='0 0 32 32' role='img'>
        <path d='M16 3.2A12.7 12.7 0 0 0 5 22.3L3.4 28.8l6.7-1.6A12.8 12.8 0 1 0 16 3.2Zm0 23.1c-2 0-4-.6-5.7-1.7l-.4-.2-4 .9.9-3.9-.3-.4a10.4 10.4 0 1 1 9.5 5.3Zm5.8-7.8c-.3-.2-1.9-1-2.2-1.1-.3-.1-.5-.2-.7.2-.2.3-.8 1.1-1 1.3-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.5.1-.2.1-.4 0-.6-.1-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.5c.2.3 2.4 3.7 5.9 5.2.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4Z' />
      </svg>
      <span>WhatsApp</span>
    </a>
  );
}
