import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, LockKeyhole, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  approveSubstackReview,
  isApprovedReviewer,
  loadSubstackReview,
  parseReviewIntent,
  requestSubstackChanges,
  REVIEW_EMAIL,
  type SubstackReview as ReviewSnapshot,
} from "@/lib/substackReview";

type ReviewView = "review" | "changes" | "confirm" | "changes_sent" | "approved";

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f5f2f7] px-4 py-10 text-[#24152b]">
      <section className="mx-auto max-w-3xl rounded-2xl border border-[#e4dce8] bg-white p-6 shadow-sm sm:p-10">
        {children}
      </section>
    </main>
  );
}

function StatusMessage({
  title,
  children,
  warning = false,
}: {
  title: string;
  children: React.ReactNode;
  warning?: boolean;
}) {
  const Icon = warning ? TriangleAlert : CheckCircle2;
  return (
    <div className="space-y-4 text-center">
      <Icon className={`mx-auto h-12 w-12 ${warning ? "text-amber-600" : "text-emerald-600"}`} />
      <h1 className="text-3xl font-semibold">{title}</h1>
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}

export default function SubstackReview() {
  const { token = "" } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const requestedIntent = useMemo(
    () => parseReviewIntent(searchParams.get("intent")),
    [searchParams],
  );
  const { user, loading: authLoading } = useAuth();
  const [review, setReview] = useState<ReviewSnapshot | null>(null);
  const [view, setView] = useState<ReviewView>(
    requestedIntent === "changes" ? "changes" : "review",
  );
  const [changes, setChanges] = useState("");
  const [loadingReview, setLoadingReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approvedAccount = isApprovedReviewer(user?.email);

  useEffect(() => {
    if (!approvedAccount || !token) return;
    let cancelled = false;
    setLoadingReview(true);
    setError(null);

    loadSubstackReview(token)
      .then((snapshot) => {
        if (!cancelled) setReview(snapshot);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load this review.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingReview(false);
      });

    return () => {
      cancelled = true;
    };
  }, [approvedAccount, token]);

  const signInWithGoogle = async () => {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.href,
        queryParams: {
          login_hint: REVIEW_EMAIL,
          prompt: "select_account",
        },
      },
    });
    if (signInError) setError(signInError.message);
  };

  const submitChanges = async () => {
    const editorialChanges = changes.trim();
    if (!editorialChanges) {
      setError("Describe the changes you want before sending the request.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await requestSubstackChanges(token, editorialChanges);
      setView("changes_sent");
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Unable to send changes.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmApproval = async () => {
    if (!review) return;
    setSubmitting(true);
    setError(null);
    try {
      await approveSubstackReview({
        token,
        version: review.version,
        contentHash: review.content_hash,
      });
      setView("approved");
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Unable to approve this draft.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <PageShell>
        <Loader2 aria-label="Loading authentication" className="mx-auto h-8 w-8 animate-spin" />
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <div className="space-y-6 text-center">
          <LockKeyhole className="mx-auto h-12 w-12 text-[#5b2c6f]" />
          <div>
            <h1 className="text-3xl font-semibold">Private Substack review</h1>
            <p className="mt-2 text-muted-foreground">
              Sign in as {REVIEW_EMAIL} before the draft can be displayed.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={signInWithGoogle}>Sign in with Google</Button>
        </div>
      </PageShell>
    );
  }

  if (!approvedAccount) {
    return (
      <PageShell>
        <StatusMessage title="Wrong Google account" warning>
          Use {REVIEW_EMAIL} to review this draft. No article content has been loaded.
        </StatusMessage>
      </PageShell>
    );
  }

  if (loadingReview || !review && !error) {
    return (
      <PageShell>
        <Loader2 aria-label="Loading review" className="mx-auto h-8 w-8 animate-spin" />
      </PageShell>
    );
  }

  if (error && !review) {
    return (
      <PageShell>
        <StatusMessage title="Review unavailable" warning>{error}</StatusMessage>
      </PageShell>
    );
  }

  if (!review) return null;

  if (review.status === "published" && review.published_url) {
    return (
      <PageShell>
        <StatusMessage title="Publication verified">
          <p>This reviewed version is live and appears in the publication record.</p>
          <a
            className="mt-5 inline-block font-semibold text-[#5b2c6f] underline"
            href={review.published_url}
            rel="noreferrer"
            target="_blank"
          >
            Open live post
          </a>
        </StatusMessage>
      </PageShell>
    );
  }

  if (view === "changes_sent") {
    return (
      <PageShell>
        <StatusMessage title="Changes requested">
          The current approval link is closed. A revised version and a new review email will follow.
        </StatusMessage>
      </PageShell>
    );
  }

  if (view === "approved" || review.status === "approved" || review.status === "publishing") {
    return (
      <PageShell>
        <StatusMessage title="Approved and queued">
          The local publisher will use this exact content version. You will receive the verified live link after publication.
        </StatusMessage>
      </PageShell>
    );
  }

  if (view === "confirm") {
    return (
      <PageShell>
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#5b2c6f]">Final confirmation</p>
            <h1 className="mt-2 text-3xl font-semibold">{review.selected_headline}</h1>
          </div>
          <dl className="grid gap-2 rounded-lg bg-[#f5f2f7] p-4 text-sm">
            <div><dt className="inline font-semibold">Version </dt><dd className="inline">{review.version}</dd></div>
            <div><dt className="inline font-semibold">Content hash </dt><dd className="inline font-mono">{review.content_hash.slice(0, 12)}</dd></div>
          </dl>
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 font-semibold text-amber-950">
            Confirming publishes this article publicly and emails all Substack subscribers immediately.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => setView("review")} disabled={submitting}>Back to Review</Button>
            <Button onClick={confirmApproval} disabled={submitting}>
              {submitting ? "Confirming" : "Confirm Publish"}
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  if (view === "changes") {
    return (
      <PageShell>
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">Version {review.version}</p>
            <h1 className="text-3xl font-semibold">Request changes</h1>
            <p className="mt-2 text-muted-foreground">{review.selected_headline}</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="requested-changes" className="text-sm font-semibold">Requested changes</label>
            <Textarea
              id="requested-changes"
              value={changes}
              onChange={(event) => setChanges(event.target.value)}
              rows={8}
              placeholder="Describe what needs to change in the article."
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => setView("review")} disabled={submitting}>Back to Review</Button>
            <Button onClick={submitChanges} disabled={submitting}>
              {submitting ? "Sending" : "Send Change Request"}
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <article className="space-y-8">
        <header>
          <p className="text-sm text-muted-foreground">Draft {review.draft_id} | Version {review.version}</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight">{review.selected_headline}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{review.subtitle}</p>
        </header>
        <div className="whitespace-pre-wrap text-base leading-7">{review.article_markdown}</div>
        <section className="rounded-lg bg-[#f5f2f7] p-5">
          <h2 className="font-semibold">Substack Notes teaser</h2>
          <p className="mt-2 whitespace-pre-wrap">{review.notes_teaser}</p>
        </section>
        <section className="rounded-lg bg-[#f5f2f7] p-5">
          <h2 className="font-semibold">Subscribe call</h2>
          <p className="mt-2 whitespace-pre-wrap">{review.subscribe_call}</p>
        </section>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row">
          <Button variant="outline" onClick={() => setView("changes")}>Request Changes</Button>
          <Button onClick={() => setView("confirm")}>Approve and Publish</Button>
        </div>
      </article>
    </PageShell>
  );
}
