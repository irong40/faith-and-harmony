const Footer = () => {
  return (
    <footer className="border-t border-border bg-card mt-auto py-4 px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
        <span>Sentinel Aerial Inspections</span>
        <span>&copy; {new Date().getFullYear()} Faith &amp; Harmony LLC. All rights reserved.</span>
      </div>
    </footer>
  );
};

export default Footer;
