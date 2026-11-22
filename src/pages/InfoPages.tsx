import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail, MapPin, Phone } from 'lucide-react';
import { SeoHead } from '../components/common/SeoHead.tsx';
import { SmartImage } from '../components/common/SmartImage.tsx';
import { EDITORIAL_MEDIA } from '../lib/media.ts';
import { useToast } from '../contexts/ToastContext.tsx';

export function Collections() {
  const collections = [
    {
      name: 'The Everyday Edit',
      slug: 'the-everyday-edit',
      subtitle: 'Refined wardrobe anchors for daily rotation',
      description: 'Garment-washed linen-cotton shirting, brushed twill overshirts, and structured canvas carryalls.',
      image: EDITORIAL_MEDIA.collections.everydayEdit,
    },
    {
      name: 'Urban Streetwear',
      slug: 'urban-streetwear',
      subtitle: 'Heavyweight jersey & utility proportions',
      description: '440 GSM loopback French terry hoodies, articulated ripstop cargos, and boxy dry-hand cotton tees.',
      image: EDITORIAL_MEDIA.collections.urbanStreetwear,
    },
    {
      name: 'Minimal Essentials',
      slug: 'minimal-essentials',
      subtitle: 'Clean silhouettes in neutral palettes',
      description: '280 GSM combed organic cotton basics, Italian leather court sneakers, and sculpted rib knits.',
      image: EDITORIAL_MEDIA.collections.minimalEssentials,
    },
    {
      name: 'Summer Breeze',
      slug: 'summer-breeze',
      subtitle: 'Breathable Belgian flax & coastal tailoring',
      description: 'Pleated A-line linen dresses, open camp-collar resort shirts, and airy drawstring trousers.',
      image: EDITORIAL_MEDIA.collections.summerBreeze,
    },
    {
      name: 'Contemporary Classics',
      slug: 'contemporary-classics',
      subtitle: 'Architectural tailoring built to endure',
      description: 'Japanese selvedge denim, recycled wool-twill overshirts, fine merino knitwear, and Goodyear-welted loafers.',
      image: EDITORIAL_MEDIA.collections.contemporaryClassics,
    },
  ];

  return (
    <>
      <SeoHead title="Collections" description="Explore curated seasonal capsules and signature edits from ATELIER." />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">Seasonal Capsules</p>
        <h1 className="mt-1 font-display text-4xl font-bold text-[#171717]">Curated Collections</h1>

        <div className="mt-10 space-y-10">
          {collections.map((col, idx) => (
            <div
              key={col.slug}
              className="grid lg:grid-cols-12 gap-8 items-center rounded-3xl border border-[#E8E8E5] bg-white p-6 sm:p-8"
            >
              <div className={`lg:col-span-6 aspect-[16/10] overflow-hidden rounded-2xl bg-[#F2F2EF] ${idx % 2 === 1 ? 'lg:order-2' : ''}`}>
                <SmartImage src={col.image} alt={col.name} className="h-full w-full object-cover" />
              </div>
              <div className="lg:col-span-6 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">{col.subtitle}</p>
                <h2 className="font-display text-3xl font-bold text-[#171717]">{col.name}</h2>
                <p className="text-sm leading-relaxed text-[#777777]">{col.description}</p>
                <Link
                  to={`/shop?collection=${col.slug}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[#171717] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#2a2a2a]"
                >
                  Shop Collection <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function About() {
  return (
    <>
      <SeoHead title="About Us & Sustainability" description="The story, material provenance, and atelier craft behind ATELIER." />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">Our Story</p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#171717] text-balance">
              CLOTHING DESIGNED FOR QUIET LONGEVITY.
            </h1>
            <p className="text-base leading-relaxed text-[#777777]">
              Founded as an independent design studio, ATELIER creates thoughtful wardrobe foundations that balance relaxed architectural volume with enduring natural textiles.
            </p>
          </div>
          <div className="lg:col-span-6 aspect-[4/3] overflow-hidden rounded-3xl border border-[#E8E8E5] bg-[#F2F2EF]">
            <SmartImage src={EDITORIAL_MEDIA.heroBlazer} alt="ATELIER Studio Tailoring" className="h-full w-full object-cover" />
          </div>
        </div>

        <section id="sustainability" className="grid lg:grid-cols-12 gap-10 items-center rounded-3xl border border-[#E8E8E5] bg-white p-8 sm:p-12">
          <div className="lg:col-span-6 aspect-[4/3] overflow-hidden rounded-2xl bg-[#F2F2EF]">
            <SmartImage src={EDITORIAL_MEDIA.sustainability} alt="Organic raw linen and cotton bolts" className="h-full w-full object-cover" />
          </div>
          <div className="lg:col-span-6 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">Sustainability</p>
            <h2 className="font-display text-3xl font-bold text-[#171717]">STYLE WITH PURPOSE.</h2>
            <p className="text-sm leading-relaxed text-[#777777]">
              Over 88% of our seasonal fibers are certified organic cotton, European flax linen, or recycled wool. We partner exclusively with audited small-batch ateliers offering living wages and closed-loop water dyeing.
            </p>
            <Link to="/shop" className="inline-flex items-center gap-2 rounded-full bg-[#171717] px-6 py-3 text-xs font-semibold text-white">
              Explore Conscious Pieces <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

export function Contact() {
  const { showToast } = useToast();
  const [sent, setSent] = useState(false);

  return (
    <>
      <SeoHead title="Contact Us" description="Reach ATELIER concierge for sizing advice, order support, and studio inquiries." />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-16 grid md:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">Concierge</p>
            <h1 className="mt-1 font-display text-4xl font-bold text-[#171717]">Get in Touch</h1>
            <p className="mt-2 text-sm text-[#777777]">
              Our styling and order concierge replies within one business day.
            </p>
          </div>
          <div className="space-y-4 text-sm text-[#171717]">
            <p className="flex items-center gap-3"><Mail className="h-4 w-4 text-[#777777]" /> concierge@atelier-store.com</p>
            <p className="flex items-center gap-3"><Phone className="h-4 w-4 text-[#777777]" /> +91 22 4890 1200 (Mon–Sat, 10 AM – 7 PM IST)</p>
            <p className="flex items-center gap-3"><MapPin className="h-4 w-4 text-[#777777]" /> Kala Ghoda Design District, Mumbai 400001</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
            showToast('Message received by ATELIER concierge');
          }}
          className="rounded-3xl border border-[#E8E8E5] bg-white p-6 sm:p-8 space-y-4"
        >
          {sent ? (
            <div className="py-10 text-center space-y-2">
              <p className="font-display text-xl font-bold text-[#171717]">Message Received</p>
              <p className="text-sm text-[#777777]">We will respond to your email shortly.</p>
            </div>
          ) : (
            <>
              <input required placeholder="Full Name" className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-4 py-2.5 text-sm" />
              <input required type="email" placeholder="Email Address" className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-4 py-2.5 text-sm" />
              <textarea required rows={4} placeholder="How can we help?" className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-4 py-2.5 text-sm" />
              <button type="submit" className="w-full rounded-full bg-[#171717] py-3 text-xs font-semibold uppercase tracking-wider text-white">
                Send Inquiry
              </button>
            </>
          )}
        </form>
      </div>
    </>
  );
}

export function SizeGuidePage() {
  return (
    <>
      <SeoHead title="Size Guide" description="ATELIER garment measurements and footwear conversion charts." />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16 space-y-8">
        <h1 className="font-display text-3xl sm:text-4xl font-bold">Size Guide</h1>
        <div className="rounded-3xl border border-[#E8E8E5] bg-white p-6 overflow-x-auto">
          <h2 className="font-display text-lg font-bold mb-4">Tops, Shirts &amp; Outerwear</h2>
          <table className="w-full text-sm text-left tabular-nums">
            <thead>
              <tr className="border-b border-[#E8E8E5] text-xs uppercase text-[#777777]">
                <th className="py-2.5">Size</th><th className="py-2.5">Chest (in)</th><th className="py-2.5">Shoulder (cm)</th><th className="py-2.5">Length (cm)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E5]">
              <tr><td className="py-3 font-semibold">XS</td><td>34–36</td><td>44</td><td>67</td></tr>
              <tr><td className="py-3 font-semibold">S</td><td>36–38</td><td>46</td><td>69</td></tr>
              <tr><td className="py-3 font-semibold">M</td><td>38–40</td><td>48</td><td>71</td></tr>
              <tr><td className="py-3 font-semibold">L</td><td>40–42</td><td>50</td><td>73</td></tr>
              <tr><td className="py-3 font-semibold">XL</td><td>42–45</td><td>52</td><td>75</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function FaqPage() {
  const faqs = [
    { q: 'How long does shipping take?', a: 'Standard orders arrive in 3–5 business days across India. Express orders deliver in 1–2 business days.' },
    { q: 'What is your return and exchange policy?', a: 'Unworn garments with original tags can be returned or exchanged within 14 days of delivery.' },
    { q: 'Are your cotton and linen pieces pre-shrunk?', a: 'Yes, all ATELIER cotton jersey and Belgian linen silhouettes are garment-washed prior to finishing.' },
    { q: 'Do you offer Cash on Delivery?', a: 'Yes, Cash on Delivery is available across serviceable pin codes alongside Razorpay (UPI/Cards) and Stripe.' },
  ];
  return (
    <>
      <SeoHead title="FAQs" description="Answers to common questions about ATELIER orders, sizing, and shipping." />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16 space-y-6">
        <h1 className="font-display text-3xl sm:text-4xl font-bold">Frequently Asked Questions</h1>
        <div className="divide-y divide-[#E8E8E5] rounded-3xl border border-[#E8E8E5] bg-white px-6">
          {faqs.map((f) => (
            <details key={f.q} open className="py-5">
              <summary className="cursor-pointer font-semibold text-base text-[#171717]">{f.q}</summary>
              <p className="mt-2 text-sm text-[#777777] leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}

export function PolicyPage({ kind }: { kind: 'shipping' | 'privacy' | 'terms' }) {
  const titles = {
    shipping: 'Shipping, Returns & Refund Policy',
    privacy: 'Privacy Policy',
    terms: 'Terms & Conditions',
  };
  return (
    <>
      <SeoHead title={titles[kind]} description={`ATELIER ${titles[kind]} documentation.`} />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16 space-y-5">
        <h1 className="font-display text-3xl sm:text-4xl font-bold">{titles[kind]}</h1>
        <div className="rounded-3xl border border-[#E8E8E5] bg-white p-6 sm:p-8 space-y-4 text-sm leading-relaxed text-[#777777]">
          {kind === 'shipping' && (
            <>
              <p>Orders above ₹1,999 qualify for complimentary standard delivery. Orders under ₹1,999 incur a flat ₹149 shipping fee, or ₹299 for priority express dispatch.</p>
              <p>Returns and size exchanges are accepted within 14 days of delivery provided items remain unworn with original tags attached. Refunds to original payment methods are processed within 5 business days of inspection.</p>
            </>
          )}
          {kind === 'privacy' && (
            <>
              <p>ATELIER collects only the customer details required to fulfill your orders, authenticate your account, and improve storefront reliability.</p>
              <p>Payment credentials are processed exclusively through certified payment gateways and are never stored on our servers.</p>
            </>
          )}
          {kind === 'terms' && (
            <>
              <p>All pricing is listed in Indian Rupees (INR) inclusive of applicable taxes unless stated otherwise at checkout.</p>
              <p>Promotional coupon codes such as WELCOME10, ATELIER20, and FIRSTORDER are subject to minimum order values and validity windows.</p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
