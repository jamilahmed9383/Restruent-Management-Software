import { useListAdminReviews, getListAdminReviewsQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MessageSquare } from "lucide-react";
import { format } from "date-fns";

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/20"}`} />
      ))}
    </div>
  );
}

const RATING_LABELS: Record<number, string> = { 1: "Poor", 2: "Fair", 3: "Good", 4: "Great", 5: "Excellent" };

export default function ReviewsTab({ adminEnabled }: { adminEnabled: boolean }) {
  const { data: reviews, isLoading } = useListAdminReviews({
    query: { queryKey: getListAdminReviewsQueryKey(), refetchInterval: 15000, enabled: adminEnabled },
  });

  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length)
    : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map(r => ({
    rating: r,
    count: reviews?.filter(v => v.rating === r).length ?? 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-background border border-border rounded-3xl p-5 shadow-sm flex flex-col gap-2 sm:col-span-1">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Overall Rating</span>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-serif font-bold text-foreground">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</span>
            {avgRating > 0 && <span className="text-muted-foreground mb-1.5">/ 5</span>}
          </div>
          {avgRating > 0 && <StarDisplay rating={Math.round(avgRating)} />}
          <span className="text-xs text-muted-foreground mt-1">{reviews?.length ?? 0} total review{reviews?.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="bg-background border border-border rounded-3xl p-5 shadow-sm sm:col-span-2">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-4 block">Rating Breakdown</span>
          <div className="flex flex-col gap-2.5">
            {ratingCounts.map(({ rating, count }) => {
              const pct = reviews && reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1 w-16 shrink-0">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-medium text-foreground">{rating}</span>
                    <span className="text-xs text-muted-foreground">({count})</span>
                  </div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Review List */}
      <div className="bg-background border border-border rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-serif font-bold text-base">Customer Reviews</h3>
        </div>

        {isLoading ? (
          <div className="p-5 flex flex-col gap-3">
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        ) : !reviews || reviews.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-muted-foreground">
            <Star className="w-10 h-10 opacity-20" />
            <p className="font-medium">No reviews yet</p>
            <p className="text-xs">Reviews appear here when customers rate their experience</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {reviews.map((review) => (
              <div key={review.id} className="px-6 py-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                      T{review.tableNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <StarDisplay rating={review.rating} />
                        <span className="text-xs font-medium text-foreground">{RATING_LABELS[review.rating]}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Table {review.tableNumber}
                        {review.orderId ? ` · Order #${review.orderId}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(review.createdAt), "MMM d, HH:mm")}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-sm text-foreground bg-muted/40 px-4 py-2.5 rounded-xl ml-11">
                    "{review.comment}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
