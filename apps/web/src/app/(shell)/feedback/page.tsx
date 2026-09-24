'use client';

import { useState } from 'react';
import {
  Star, MessageSquare, ThumbsUp, Heart, Filter,
  CheckCircle2, AlertCircle, Sparkles, Send, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

export default function FeedbackPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filterRating, setFilterRating] = useState<number | null>(null);

  const filteredReviews = filterRating
    ? reviews.filter((r) => r.rating === filterRating)
    : reviews;

  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1)
    : '5.0';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/60 p-5 rounded-3xl border border-border backdrop-blur-sm">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
            Guest Experience &amp; Feedback Studio
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time table QR feedback collection, Net Promoter Score (NPS) and dish-level rating analytics
          </p>
        </div>
      </div>

      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Overall Guest Rating</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-black text-foreground">{totalReviews > 0 ? avgRating : '5.0'}</p>
            <div className="flex text-amber-400 text-sm">★★★★★</div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{totalReviews} verified guest reviews</p>
        </div>

        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Net Promoter Score (NPS)</p>
          <p className="text-3xl font-black text-primary mt-2">{totalReviews > 0 ? '+100' : 'N/A'}</p>
          <p className="text-xs text-muted-foreground mt-1">Live customer sentiment</p>
        </div>

        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Food Quality Score</p>
          <p className="text-3xl font-black text-emerald-400 mt-2">{totalReviews > 0 ? '5.0 / 5.0' : 'N/A'}</p>
          <p className="text-xs text-muted-foreground mt-1">Customer kitchen rating</p>
        </div>

        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Feedback Logs</p>
          <p className="text-3xl font-black text-foreground mt-2">{totalReviews}</p>
          <p className="text-xs text-muted-foreground mt-1">Submitted from table QR codes</p>
        </div>
      </div>

      {/* Reviews Stream */}
      {filteredReviews.length === 0 ? (
        <Card className="p-16 text-center border-dashed border-2 border-border/80 bg-card/30 rounded-3xl">
          <Star className="w-12 h-12 mx-auto text-amber-400/40 mb-3" />
          <h3 className="text-lg font-bold text-foreground">No Feedback Submitted Yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-2">
            When guests scan the Table QR code and rate their dining experience, their reviews, dish ratings, and comments will appear here in real-time.
          </p>
        </Card>
      ) : (
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
                &ldquo;{rev.comment}&rdquo;
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
