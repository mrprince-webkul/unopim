import { useState } from "react";
import { Mail, Phone, MapPin, Send, Sparkles } from "lucide-react";
import { Seo } from "@/components/seo";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/primitives/Button";
import { SectionHeader } from "@/components/ui/primitives/SectionHeader";
import { useContactSubmit, type ContactPayload } from "@/hooks/useContactSubmit";

const emptyForm: ContactPayload = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

const contactInfo = [
  {
    icon: Mail,
    label: "Email",
    value: "princekrdss2018@gmail.com",
    href: "mailto:princekrdss2018@gmail.com",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+91 7369900185",
    href: "tel:+917369900185",
  },
  {
    icon: MapPin,
    label: "Location",
    value: "New Delhi, India",
    href: "#",
  },
];

const devQuotes = [
  "First, solve the problem. Then, write the code.",
  "Code is like humor. When you have to explain it, it's bad.",
  "It's not a bug — it's an undocumented feature.",
];

const faqs = [
  {
    question: "What technologies do you work with?",
    answer:
      "I primarily work with React, Node.js, TypeScript, Next.js, and MongoDB. I'm always exploring new tools and frameworks to stay up to date.",
  },
  {
    question: "How many years of experience do you have?",
    answer:
      "I have hands-on experience building full-stack web applications and have been actively developing and learning in the field for several years.",
  },
  {
    question: "Do you contribute to open source?",
    answer:
      "Yes! I enjoy contributing to open-source projects and sharing my work on GitHub. Feel free to check out my repositories.",
  },
  {
    question: "Are you open to collaborations?",
    answer:
      "Absolutely! I'm always open to collaborating on interesting open-source projects, hackathons, or any fun dev ideas. Just drop me a message!",
  },
];

const Contact = () => {
  const { submit, isSubmitting } = useContactSubmit();
  const [form, setForm] = useState<ContactPayload>(emptyForm);

  const resetForm = () => setForm(emptyForm);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await submit(form);
    if (ok) resetForm();
  };

  return (
    <>
      <Seo
        title="Contact | Prince Kumar Sahni - Software Engineer"
        description="Learn more about Prince Kumar Sahni, a passionate Software Engineer dedicated to building scalable, secure, and high-performing applications."
        url="https://princesahni.com/contact"
        image="https://princesahni.com/og-images/princesahni-logo.png"
      />

      <section className="container mx-auto px-6 py-16">
        <div className="max-w-2xl">
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-primary">
            Say hello
          </span>
          <h1 className="mt-3 font-display text-4xl text-foreground md:text-5xl">
            Get in Touch
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Have a question or want to connect? Feel free to reach out — I'd
            love to hear from you!
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-[1.4fr,1fr]">
          {/* Contact Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-xl border border-border bg-card p-6 md:p-8"
          >
            <div>
              <h2 className="font-display text-xl text-foreground md:text-2xl">
                Send a Message
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Fill out the form below and I'll get back to you as soon as
                possible.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                  Full Name *
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="your.email@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                Phone
              </Label>
              <Input
                id="phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                placeholder="Your phone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject" className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                Subject *
              </Label>
              <Input
                id="subject"
                name="subject"
                value={form.subject}
                onChange={handleChange}
                required
                placeholder="What's this about?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                Message *
              </Label>
              <Textarea
                id="message"
                name="message"
                value={form.message}
                onChange={handleChange}
                required
                placeholder="Write your message here..."
                className="min-h-[140px] resize-none"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="w-full justify-center"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "Sending..." : "Send Message"}
            </Button>
          </form>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Details */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-display text-lg text-foreground">
                Contact Information
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You can also reach me directly through any of these channels.
              </p>
              <div className="mt-4 space-y-1">
                {contactInfo.map((info) => {
                  const Icon = info.icon;
                  return (
                    <a
                      key={info.label}
                      href={info.href}
                      className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                          {info.label}
                        </p>
                        <p className="text-sm text-foreground">{info.value}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Availability */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]" />
                <span className="font-mono text-xs uppercase tracking-wide text-foreground">
                  Open to opportunities
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                I'm always excited to contribute to open-source projects,
                participate in hackathons, and share knowledge on tech topics.
                Let's connect and build something awesome!
              </p>
            </div>

            {/* Dev Vibes */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-display text-lg text-foreground">Dev Vibes</h3>
              </div>
              <div className="mt-4 space-y-3">
                {devQuotes.map((quote) => (
                  <p
                    key={quote}
                    className="border-l-2 border-primary pl-3 text-sm italic text-muted-foreground"
                  >
                    "{quote}"
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <SectionHeader index="01" title="Frequently Asked Questions" />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {faqs.map((faq) => (
              <div key={faq.question}>
                <h4 className="font-display text-base text-foreground">
                  {faq.question}
                </h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default Contact;
