import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  LogOut,
  Settings,
  Plane,
  Menu,
  LayoutDashboard,
  Activity,
  Truck,

  Users,
} from "lucide-react";

export default function Navbar() {
  const { user, isAdmin, isPilot, signOut } = useAuth();

  // Unauthenticated users see nothing here — Auth page has its own layout
  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2">
            <span className="font-semibold text-primary text-sm tracking-wide">Sentinel</span>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-1">
            {isAdmin && (
              <>
                <Link to="/admin/dashboard">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <Link to="/admin/drone-jobs">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                    <Plane className="h-4 w-4" />
                    Missions
                  </Button>
                </Link>
                <Link to="/admin/pipeline">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                    <Activity className="h-4 w-4" />
                    Pipeline
                  </Button>
                </Link>
              </>
            )}
            {isPilot && (
              <>
                <Link to="/pilot">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                    <Plane className="h-4 w-4" />
                    Missions
                  </Button>
                </Link>
                <Link to="/pilot/fleet">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                    <Truck className="h-4 w-4" />
                    Fleet
                  </Button>
                </Link>
              </>
            )}
            {isAdmin && (
              <>
                <Link to="/admin/pilots">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                    <Users className="h-4 w-4" />
                    Pilots
                  </Button>
                </Link>
                <Link to="/admin/settings">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* User menu */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline max-w-32 truncate text-sm">
                    {user.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                  {isAdmin && <p className="text-xs text-accent">Administrator</p>}
                  {isPilot && !isAdmin && <p className="text-xs text-accent">Pilot</p>}
                </div>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/dashboard" className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                {isPilot && (
                  <DropdownMenuItem asChild>
                    <Link to="/pilot" className="flex items-center gap-2">
                      <Plane className="h-4 w-4" />
                      Pilot Portal
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/dashboard" className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/drone-jobs" className="flex items-center gap-2">
                        <Plane className="h-4 w-4" />
                        Missions
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/pipeline" className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Pipeline
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/pilots" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Pilots
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {isPilot && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/pilot" className="flex items-center gap-2">
                        <Plane className="h-4 w-4" />
                        Missions
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/pilot/fleet" className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Fleet
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
