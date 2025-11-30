// app/(marketing)/faqs/page.tsx

'use client';

import { PageSection } from '@/components/page-section';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { MinusIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'pricing' | 'technical';
}

const faqItems: FaqItem[] = [
  {
    id: '1',
    question: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    answer:
      'Lorem ipsum dolor sit, amet consectetur adipisicing elit. Quam similique odio fuga voluptas aliquid doloribus eveniet, et rerum ea ducimus.',
    category: 'general',
  },
  {
    id: '2',
    question: 'Lorem ipsum dolor sit amet, consectetur?',
    answer:
      'Lorem ipsum dolor sit, amet consectetur adipisicing elit. Quam similique odio fuga voluptas aliquid doloribus eveniet, et rerum ea ducimus.',
    category: 'general',
  },
  {
    id: '3',
    question: 'How often are new components added?',
    answer:
      'We regularly add new components to the library. Our goal is to provide a comprehensive set of components for all common UI patterns and website sections.',
    category: 'general',
  },

  {
    id: '4',
    question: 'Lorem ipsum dolor sit amet, consectetur?',
    answer:
      "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Quam similique odio fuga voluptas aliquid doloribus eveniet, et rerum ea ducimus.",
    category: 'general',
  },
  {
    id: '5',
    question: 'Lorem ipsum dolor sit amet, consectetur?',
    answer:
      "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Quam similique odio fuga voluptas aliquid doloribus eveniet, et rerum ea ducimus.",
    category: 'technical',
  },
  {
    id: '6',
    question: 'Lorem ipsum dolor sit amet, consectetur?',
    answer:
      'Lorem ipsum dolor sit, amet consectetur adipisicing elit. Quam similique odio fuga voluptas aliquid doloribus eveniet, et rerum ea ducimus.',
    category: 'technical',
  },
  {
    id: '7',
    question: 'Lorem ipsum dolor sit amet, consectetur??',
    answer:
      "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Quam similique odio fuga voluptas aliquid doloribus eveniet, et rerum ea ducimus.",
    category: 'technical',
  },
  
  {
    id: '8',
    question: 'Lorem ipsum dolor sit amet, consectetur??',
    answer:
      'Lorem ipsum dolor sit, amet consectetur adipisicing elit. Quam similique odio fuga voluptas aliquid doloribus eveniet, et rerum ea ducimus.',
    category: 'technical',
  },
  {
    id: '9',
    question: 'How does the Free Plan credit system work?',
    answer:
      'On the Free plan, you receive a monthly allowance of 5 credits. This resets every month on the anniversary of the day you joined. Think of it as a "top-up"—if you have used your credits, we refill them to 5. If you haven\'t used them, they do not roll over to the next month.',
    category: 'pricing',
  },
  {
    id: '10',
    question: 'I purchased a "Pay As You Go" pack. Do these credits expire?',
    answer:
      'No. Unlike the free monthly allowance, any credits you purchase via "Pay As You Go" or receive through a "Pro" subscription are yours to keep. They roll over indefinitely until you use them.',
    category: 'pricing',
  },
  {
    id: '11',
    question: 'I have 20 credits left from a pack I bought. Will I still get my 5 free credits this month?',
    answer:
      'No. The monthly free credits are designed as a "safety net" to ensure you can always use the platform. If your balance is already higher than 5 (due to a purchase or subscription), we do not add the free allowance on top of it.',
    category: 'pricing',
  },
  {
    id: '12',
    question: 'If I upgrade to the Pro Plan, what happens to my current credits?',
    answer:
      'You keep them! Any credits you currently have (whether free or purchased) will carry over. When you subscribe to Pro, we simply add 100 new credits to your existing balance immediately.',
    category: 'pricing',
  },
  {
    id: '13',
    question: 'What happens if I run out of credits before my next billing cycle?',
    answer:
      'You have two options:\
        You can wait for your next monthly refill (or billing date).\
        1. You can purchase a "Pay As You Go" pack (e.g., 50 credits for $5) to continue 2. working immediately. You do not need to upgrade your subscription to buy extra credits.',
    category: 'pricing',
  },
  {
    id: '14',
    question: 'If I cancel my Pro subscription, do I lose my credits?',
    answer:
      'No. You retain all the credits you paid for. Once your subscription ends, you will simply return to the Free tier rules: you will use your remaining credits until they run out. Once they drop below 5, the monthly free top-up logic will resume.',
    category: 'pricing',
  },

];

const categories = [
  { id: 'all', label: 'All' },
  { id: 'general', label: 'General' },
  { id: 'technical', label: 'Technical' },
  { id: 'pricing', label: 'Pricing' },
];

export default function Faq2() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredFaqs =
    activeCategory === 'all'
      ? faqItems
      : faqItems.filter((item) => item.category === activeCategory);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <PageSection className="bg-background">
      <div className="flex flex-col items-center space-y-8 px-4">
        <Badge
          variant="outline"
          className="border-primary mb-4 px-3 py-1 text-xs font-medium tracking-wider uppercase"
        >
          FAQs
        </Badge>

          <h1 className="text-foreground mb-6 text-center text-4xl font-bold tracking-tight md:text-5xl">
            Frequently Asked Questions
          </h1>

          <p className="text-muted-foreground max-w-2xl text-center">
            Find answers to common questions about MVPBlocks and how to use our
            components to build your next project.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-all',
                activeCategory === category.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
              )}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <AnimatePresence mode="wait" initial={false}>
            {filteredFaqs.map((faq, index) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={cn(
                  'border-border h-fit overflow-hidden rounded-xl border',
                  expandedId === faq.id
                    ? 'shadow-3xl bg-card/50'
                    : 'bg-card/50',
                )}
                style={{ minHeight: '112px' }}
              >
                <button
                  onClick={() => toggleExpand(faq.id)}
                  className="flex w-full items-center justify-between p-6 text-left min-h-[112px]"
                >
                  <h3 className="text-foreground text-lg font-medium">
                    {faq.question}
                  </h3>
                  <div className="ml-4 flex-shrink-0">
                    {expandedId === faq.id ? (
                      <MinusIcon className="text-primary h-5 w-5" />
                    ) : (
                      <PlusIcon className="text-primary h-5 w-5" />
                    )}
                  </div>
                </button>

                <AnimatePresence mode="wait" initial={false}>
                  {expandedId === faq.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="border-border border-t px-6 pt-2 pb-6">
                        <p className="text-muted-foreground">{faq.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-16 text-center"
        >
          <p className="text-muted-foreground mb-4">
            Can&apos;t find what you&apos;re looking for?
          </p>
          <a
            href="#"
            className="border-primary text-foreground hover:bg-primary hover:text-primary-foreground inline-flex items-center justify-center rounded-lg border-2 px-6 py-3 font-medium transition-colors"
          >
            Contact Support
          </a>
        </motion.div>
    </PageSection>
  );
}
