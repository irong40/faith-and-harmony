import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { PilotProfile } from "@/types/pilot";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isPilot: boolean;
  pilotProfile: PilotProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshPilotProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPilot, setIsPilot] = useState(false);
  const [pilotProfile, setPilotProfile] = useState<PilotProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAdminRole = async (userId: string) => {
    const { data, error } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!error && data) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  };

  const checkPilotRole = async (userId: string) => {
    // Check for pilot role using user_roles table directly
    // Using type assertion since "pilot" role may not be in generated types yet
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "pilot")
      .maybeSingle();

    if (!error && data) {
      setIsPilot(true);
    } else {
      setIsPilot(false);
    }
  };

  const fetchPilotProfile = async (userId: string) => {
    // Query profiles table - using type assertion since Part 107 fields 
    // may not be in generated types until migrations are run
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, part_107_number, part_107_expiry")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setPilotProfile(data);
    } else {
      // If profiles table doesn't have Part 107 fields yet, create a basic profile
      setPilotProfile({
        id: userId,
        full_name: user?.email?.split("@")[0] || null,
        part_107_number: null,
        part_107_expiry: null,
      });
    }
  };

  const refreshPilotProfile = async () => {
    if (user) {
      await fetchPilotProfile(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer role checks with setTimeout to avoid deadlock
        if (session?.user) {
          console.log("AuthContext: User authenticated, checking roles for:", session.user.id);
          setTimeout(() => {
            checkAdminRole(session.user.id);
            checkPilotRole(session.user.id);
            fetchPilotProfile(session.user.id);
          }, 0);
        } else {
          console.log("AuthContext: No user session");
          setIsAdmin(false);
          setIsPilot(false);
          setPilotProfile(null);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        console.log("AuthContext: Session found on init, checking roles");
        checkAdminRole(session.user.id);
        checkPilotRole(session.user.id);
        fetchPilotProfile(session.user.id);
      } else {
        console.log("AuthContext: No initial session");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsPilot(false);
    setPilotProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAdmin,
      isPilot,
      pilotProfile,
      loading,
      signIn,
      signUp,
      signOut,
      refreshPilotProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
