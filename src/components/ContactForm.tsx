import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { siteContent } from "../data/siteContent";
import type { LocalizedContent } from "../data/siteContent";

type FormState = Record<string, string>;

type ContactFormProps = {
  content: LocalizedContent;
};

export function ContactForm({ content }: ContactFormProps) {
  const initialFormState = useMemo(
    () =>
      content.contact.fields.reduce<FormState>((state, field) => {
        state[field.name] = "";
        return state;
      }, {}),
    [content.contact.fields],
  );
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [submitted, setSubmitted] = useState(false);

  const setField = (name: string, value: string) => {
    setFormState((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = encodeURIComponent(`${content.contact.emailSubjectPrefix} ${formState.name || siteContent.brand.name}`);
    const body = encodeURIComponent(
      content.contact.fields.map((field) => `${field.label}: ${formState[field.name]}`).join("\n"),
    );
    setSubmitted(true);
    window.location.href = `mailto:${siteContent.brand.email}?subject=${subject}&body=${body}`;
  };

  return (
    <section className="section contact-section" id="contact">
      <div className="contact-copy scroll-reveal">
        <p className="eyebrow">{content.contact.eyebrow}</p>
        <h2>{content.contact.title}</h2>
        <p>{content.contact.body}</p>
        <div className="contact-channels">
          {content.contact.channels.map((channel) => (
            <a href={channel.href} key={channel.label} target={channel.href.startsWith("http") ? "_blank" : undefined} rel={channel.href.startsWith("http") ? "noreferrer" : undefined}>
              <span>{channel.label}</span>
              <strong>{channel.value}</strong>
            </a>
          ))}
        </div>
      </div>
      <form className="contact-form scroll-reveal" onSubmit={handleSubmit}>
        {content.contact.fields.map((field) => {
          if (field.type === "textarea") {
            return (
              <label key={field.name}>
                <span>{field.label}</span>
                <textarea
                  name={field.name}
                  placeholder={field.placeholder}
                  value={formState[field.name]}
                  onChange={(event) => setField(field.name, event.target.value)}
                  required
                />
              </label>
            );
          }

          if (field.type === "select") {
            return (
              <label key={field.name}>
                <span>{field.label}</span>
                <select
                  name={field.name}
                  value={formState[field.name]}
                  onChange={(event) => setField(field.name, event.target.value)}
                  required
                >
                  <option value="">{field.placeholder}</option>
                  {content.products.map((product) => (
                    <option value={product.title} key={product.id}>
                      {product.title}
                    </option>
                  ))}
                </select>
              </label>
            );
          }

          return (
            <label key={field.name}>
              <span>{field.label}</span>
              <input
                name={field.name}
                type={field.type}
                placeholder={field.placeholder}
                value={formState[field.name]}
                onChange={(event) => setField(field.name, event.target.value)}
                required={field.name !== "company"}
              />
            </label>
          );
        })}
        <button className="button button-primary" type="submit">
          {content.contact.submitLabel}
        </button>
        {submitted ? <p className="form-status">{content.contact.successMessage}</p> : null}
      </form>
    </section>
  );
}
