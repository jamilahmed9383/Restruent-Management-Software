import { useGetQueue, getGetQueueQueryKey, useSubmitReview } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ArrowLeft, Clock, CheckCircle, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const STATUS_STEPS = [
  "order_received",
  "payment_confirmed",
  "accepted",
  "preparing",
  "ready",
  "delivered"
];

const STATUS_LABELS: Record<string, string> = {
  order_received: "Received",
  payment_confirmed: "Paid",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready to Serve",
  delivered: "Delivered",
  cancelled: "Cancelled"
};

function ReviewForm({ orderId, tableNumber, onDone }: { orderId: number; tableNumber: number; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useSubmitReview();

  const handleSubmit = () => {
    if (!rating) return;
    submitMutation.mutate(
      { data: { tableNumber, orderId, rating, comment: comment.trim() || undefined } },
      {
        onSuccess: () => {
          setSubmitted(true);
          setTimeout(onDone, 1800);
        },
      }
    );
  };

  if (submitted) {
    return (
      <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl flex items-center gap-3 text-green-700 dark:text-green-400">
        <CheckCircle className="w-5 h-5 shrink-0" />
        <span className="text-sm font-medium">Thank you for your feedback!</span>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-muted/30 border border-border rounded-2xl flex flex-col gap-3">
      <p className="text-sm font-medium text-foreground">How was your experience?</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(s)}
            className="focus:outline-none"
          >
            <Star
              className={`w-7 h-7 transition-colors ${
                s <= (hover || rating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-xs text-muted-foreground">
            {["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
          </span>
        )}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Leave a comment (optional)"
        rows={2}
        className="w-full text-sm bg-background border border-border rounded-xl px-3 py-2 resize-none placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
      />
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={!rating || submitMutation.isPending}
        className="rounded-xl w-full"
      >
        {submitMutation.isPending ? "Submitting…" : "Submit Review"}
      </Button>
    </div>
  );
}

export default function Queue() {
  const { data: queue, isLoading } = useGetQueue({ query: { queryKey: getGetQueueQueryKey(), refetchInterval: 5000 } });
  const [reviewDismissed, setReviewDismissed] = useState<Set<number>>(new Set());

  const getProgress = (status: string) => {
    const idx = STATUS_STEPS.indexOf(status);
    if (idx === -1) return 0;
    return ((idx + 1) / STATUS_STEPS.length) * 100;
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col pb-10">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-4 flex items-center gap-3">
        <Link href="/menu" className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-serif font-bold text-foreground">Live Queue</h1>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : queue?.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No active orders right now.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {queue?.map((entry) => {
              const progress = getProgress(entry.status);
              const isDelivered = entry.status === "delivered";
              const showReview = isDelivered && !reviewDismissed.has(entry.id);

              return (
                <div
                  key={entry.id}
                  className={`bg-card border border-border rounded-2xl p-5 shadow-sm transition-all duration-500 ${isDelivered && reviewDismissed.has(entry.id) ? 'opacity-50 grayscale' : ''}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-muted-foreground">Table {entry.tableNumber}</span>
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none rounded-full px-2 py-0.5 text-xs font-semibold">
                          Order #{entry.id}
                        </Badge>
                      </div>
                      <h3 className="font-serif font-bold text-lg text-foreground flex items-center gap-2">
                        {STATUS_LABELS[entry.status]}
                        {isDelivered && <CheckCircle className="w-5 h-5 text-green-500" />}
                      </h3>
                    </div>
                    {entry.estimatedWaitMinutes != null && !isDelivered && (
                      <div className="flex flex-col items-end text-right">
                        <div className="flex items-center text-primary font-medium text-sm mb-1 gap-1">
                          <Clock className="w-4 h-4" />
                          <span>~{entry.estimatedWaitMinutes}m</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Wait time</span>
                      </div>
                    )}
                  </div>

                  <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                    <div
                      className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${isDelivered ? 'bg-green-500' : 'bg-primary'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-muted-foreground font-medium px-1">
                    <span>Received</span>
                    <span>Preparing</span>
                    <span>Ready</span>
                  </div>

                  {showReview && (
                    <ReviewForm
                      orderId={entry.id}
                      tableNumber={entry.tableNumber}
                      onDone={() => setReviewDismissed(prev => new Set([...prev, entry.id]))}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
