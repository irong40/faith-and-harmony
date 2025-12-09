import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  // Get SSO callback URL if present
  const ssoCallback = searchParams.get('sso_callback');

  // Handle SSO redirect for already logged-in users
  const handleSSORedirect = async (userId: string, userEmail: string) => {
    if (!ssoCallback) return;
    
    try {
      // Generate SSO token
      const { data, error } = await supabase.functions.invoke('sso-generate-token', {
        body: {
          user_id: userId,
          email: userEmail,
          display_name: userEmail.split('@')[0]
        }
      });

      if (error) throw error;

      // Redirect back to the requesting app with token
      const redirectUrl = new URL(ssoCallback);
      redirectUrl.searchParams.set('sso_token', data.sso_token);
      redirectUrl.searchParams.set('user_data', JSON.stringify(data.user_data));
      
      window.location.href = redirectUrl.toString();
    } catch (error: unknown) {
      console.error('SSO redirect error:', error);
      toast({
        title: 'SSO Error',
        description: 'Failed to complete single sign-on',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        if (ssoCallback) {
          // User is logged in and there's an SSO callback - redirect them
          handleSSORedirect(session.user.id, session.user.email || '');
        } else {
          // Normal login - go to dashboard
          navigate('/');
        }
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        if (ssoCallback) {
          handleSSORedirect(session.user.id, session.user.email || '');
        } else {
          navigate('/');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, ssoCallback]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Account created successfully',
        });
      }
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="text-4xl font-normal text-foreground tracking-[-0.02em]">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {ssoCallback 
              ? 'Sign in to continue to Event Tracking'
              : isLogin 
                ? 'Welcome back to Faith & Harmony' 
                : 'Create your Faith & Harmony account'
            }
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
          </Button>
        </form>
        
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
};

export default Auth;
