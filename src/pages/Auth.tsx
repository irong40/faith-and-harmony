import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type AuthView = 'login' | 'signup' | 'forgot-password' | 'reset-password';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [view, setView] = useState<AuthView>('login');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  const ssoCallback = searchParams.get('sso_callback');

  const handleSSORedirect = async (userId: string, userEmail: string) => {
    if (!ssoCallback) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('sso-generate-token', {
        body: {
          user_id: userId,
          email: userEmail,
          display_name: userEmail.split('@')[0]
        }
      });

      if (error) throw error;

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

  const redirectByRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const roles = (data ?? []).map((r) => r.role);

    if (roles.includes('pilot')) {
      navigate('/pilot');
    } else if (roles.includes('admin')) {
      navigate('/admin/dashboard');
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && view !== 'reset-password') {
        if (ssoCallback) {
          handleSSORedirect(session.user.id, session.user.email || '');
        } else {
          redirectByRole(session.user.id);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('reset-password');
        return;
      }

      if (session && view !== 'reset-password') {
        if (ssoCallback) {
          handleSSORedirect(session.user.id, session.user.email || '');
        } else {
          redirectByRole(session.user.id);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, ssoCallback, view]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else if (view === 'signup') {
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      
      if (error) throw error;
      
      toast({
        title: 'Check your email',
        description: 'We sent you a password reset link',
      });
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Password updated successfully',
      });
      
      navigate('/');
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

  const getTitle = () => {
    switch (view) {
      case 'login': return 'Sign In';
      case 'signup': return 'Sign Up';
      case 'forgot-password': return 'Reset Password';
      case 'reset-password': return 'Set New Password';
    }
  };

  const getSubtitle = () => {
    if (ssoCallback) return 'Sign in to continue to Event Tracking';
    switch (view) {
      case 'login': return 'Welcome back to Trestle';
      case 'signup': return 'Create your Sentinel account';
      case 'forgot-password': return 'Enter your email to receive a reset link';
      case 'reset-password': return 'Enter your new password below';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="text-4xl font-normal text-foreground tracking-[-0.02em]">
            {getTitle()}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {getSubtitle()}
          </p>
        </div>
        
        {(view === 'login' || view === 'signup') && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {view === 'login' && (
                <button
                  type="button"
                  onClick={() => setView('forgot-password')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Loading...' : view === 'login' ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>
        )}

        {view === 'forgot-password' && (
          <form onSubmit={handleForgotPassword} className="space-y-6">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
        )}

        {view === 'reset-password' && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <Input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
            <Input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        )}
        
        <div className="space-y-2">
          {view === 'forgot-password' && (
            <button
              onClick={() => setView('login')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to Sign In
            </button>
          )}
          
          {(view === 'login' || view === 'signup') && (
            <button
              onClick={() => setView(view === 'login' ? 'signup' : 'login')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {view === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
