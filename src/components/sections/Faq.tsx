import { SectionHeading } from "@/components/site/SectionHeading";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "Is this real, or a bit?",
    a: "Real board, real caps. It's a custom 65% with a milled aluminium case, lubed linears and dye-sub caps. Sponsor caps get UV-printed and mounted before the build video ships.",
  },
  {
    q: "How does payment actually work?",
    a: "You pay your full bid — between $2 and $6 — through secure checkout to lock it in. That's the whole price; nothing more is invoiced later.",
  },
  {
    q: "What if I get outbid?",
    a: "Your payment is refunded automatically to the original card the moment a higher bid clears. No emails to write, no forms to fill in.",
  },
  {
    q: "Can any brand join?",
    a: "Any dev-adjacent product, agency or indie project. I skip anything I wouldn't put in my own toolchain — crypto pump schemes, adult content, and outright scams get declined and refunded in full.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto w-full max-w-3xl px-5 py-20">
      <SectionHeading file="faq.md" title="Questions, answered plainly" />
      <Accordion type="single" collapsible className="w-full">
        {FAQS.map((item) => (
          <AccordionItem key={item.q} value={item.q}>
            <AccordionTrigger className="font-mono-ui text-left text-sm">{item.q}</AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
