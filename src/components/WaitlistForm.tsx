import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, Bell } from "lucide-react";

interface WaitlistFormProps {
  productId: string;
  productName: string;
}

const WaitlistForm = ({ productId, productName }: WaitlistFormProps) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert into waitlist
      const { error: insertError } = await supabase
        .from("product_waitlist")
        .insert({
          email: email.trim().toLowerCase(),
          product_id: productId,
          product_name: productName,
        });

      if (insertError) {
        if (insertError.code === "23505") {
          // Unique constraint violation - already on waitlist
          toast({
            title: "Already on waitlist",
            description: "You're already signed up for this product!",
          });
          setIsSuccess(true);
          return;
        }
        throw insertError;
      }

      // Send confirmation email
      await supabase.functions.invoke("send-waitlist-confirmation", {
        body: { email: email.trim(), productName },
      });

      setIsSuccess(true);
      toast({
        title: "You're on the list!",
        description: "We'll notify you when this artwork is available.",
      });
    } catch (error: unknown) {
      console.error("Waitlist signup error:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex items-center gap-2 text-accent">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">You're on the waitlist!</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="flex-1 px-3 py-2 text-sm rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-accent text-foreground placeholder:text-muted-foreground"
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-accent text-primary text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          Notify Me
        </button>
      </div>
    </form>
  );
};

export default WaitlistForm;
