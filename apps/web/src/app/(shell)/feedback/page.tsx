'use client';

import { useState } from 'react';
import {
  Star, MessageSquare, ThumbsUp, Heart, Filter,
  CheckCircle2, AlertCircle, Sparkles, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Review {
  id: string;
  customerName: string;
  table: string;
  rating: number;
  foodRating: number;
  serviceRating: number;
  ambienceRating: number;
  comment: string;
  timeAgo: string;
  status: 'RESOLVED' | 'ACKNOWLEDGED';
  dishRatings: { dish: string; stars: number }[];
}

const initialReviews: Review[] = [
  {
    id: 'fb-001',
    customerName: 'Ananya Sharma',
    table: 'T5',
    rating: 5,
    foodRating: 5,
    serviceRating: 5,
    ambienceRating: 4,
    comment: 'Outstanding Butter Chicken and Dal Makhani! Service was prompt, Captain Priya made our anniversary special.',
    timeAgo: '3 hours ago',
    status: 'RESOLVED',
    dishRatings: [
      { dish: 'Butter Chicken', stars: 5 },
      { dish: 'Butter Naan', stars: 5 },
    ],
  },
  {
    id: 'fb-002',
    customerName: 'Rohan Mehra',
    table: 'T2',
    rating: 4,
    foodRating: 5,
    serviceRating: 4,
    ambienceRating: 4,
    comment: 'Great flavors and piping hot biryani. Slight delay in beverage refill during peak hour.',
    timeAgo: '7 hours ago',
    status: 'ACKNOWLEDGED',
    dishRatings: [
      { dish: 'Chicken Biryani', stars: 5 },
      { dish: 'Mango Lassi', stars: 4 },
    ],
  },
  {
    id: 'fb-003',
    customerName: 'Vikram Kapoor',
    table: 'T7',
    rating: 5,
    foodRating: 5,
    serviceRating: 5,
    ambienceRating: 5,
    comment: 'Perfect venue for family dinner! The Paneer Tikka was melt in the mouth and smokey.',
    timeAgo: 'Yesterday',
    status: 'RESOLVED',
    dishRatings: [
      { dish: 'Paneer Tikka', stars: 5 },
      { dish: 'Garlic Naan', stars: 5 },
    ],
  },
];

export default function FeedbackPage() {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [filterRating, setFilterRating] = useState<number | null>(null);

  const filteredReviews = filterRating
    ? reviews.filter((r) => r.rating === filterRating)
    : reviews;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
            Guest Experience & Feedback Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time table QR feedback collection, Net Promoter Score (NPS) and dish-level rating analytics
          </p>
        </div>
      </div>

      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Overall Guest Rating</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-black text-foreground">4.8</p>
            <div className="flex text-amber-400 text-sm">★★★★★</div>
          </div>
          <p className="text-xs text-emerald-400 mt-1">Based on 328 verified reviews</p>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Net Promoter Score (NPS)</p>
          <p className="text-3xl font-black text-primary mt-2">+78</p>
          <p className="text-xs text-emerald-400 mt-1">World-class hospitality benchmark</p>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Food Quality Score</p>
          <p className="text-3xl font-black text-emerald-400 mt-2">4.9 / 5.0</p>
          <p className="text-xs text-muted-foreground mt-1">98% positive sentiment</p>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Service & Ambience</p>
          <p className="text-3xl font-black text-amber-400 mt-2">4.7 / 5.0</p>
          <p className="text-xs text-muted-foreground mt-1">Avg 3.2m response time</p>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-semibold uppercase mr-2">Filter:</span>
        <button
          onClick={() => setFilterRating(null)}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
            filterRating === null ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          All Stars
        </button>
        {[5, 4, 3].map((star) => (
          <button
            key={star}
            onClick={() => setFilterRating(star)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              filterRating === star ? 'bg-amber-400 text-black' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {star} Stars
          </button>
        ))}
      </div>

      {/* Reviews Stream */}
      <div className="space-y-4">
        {filteredReviews.map((rev) => (
          <div
            key={rev.id}
            className="p-6 rounded-2xl border border-border bg-card/70 backdrop-blur hover:border-border/80 transition-all space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-sm">
                    {rev.customerName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                      {rev.customerName}
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                        Table {rev.table}
                      </span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{rev.timeAgo}</p>
                  </div>
                </div>
              </div>

              <div className="text-right flex items-center gap-1.5 text-amber-400 text-base font-bold">
                ★ {rev.rating}.0
              </div>
            </div>

            <p className="text-sm text-foreground/90 leading-relaxed bg-background/40 p-3.5 rounded-xl border border-border/50">
              "{rev.comment}"
            </p>

            {/* Dish Level Ratings */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground font-semibold">Dishes Rated:</span>
              {rev.dishRatings.map((dish, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-card border border-border text-foreground font-medium"
                >
                  {dish.dish}
                  <span className="text-amber-400 font-bold">★ {dish.stars}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
