import { Zap } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();
  const utmLink = `https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`;

  return (
    <footer className="bg-foreground text-card py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-primary-foreground fill-current" />
            </div>
            <span className="font-bold text-sm">
              <span className="text-card">Flash</span>
              <span className="text-primary">Mart</span>
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 text-xs text-card/60">
            <span>Hyperlocal delivery, instantly.</span>
            <span className="hidden sm:block">|</span>
            <p>
              © {year}. Built with ❤️ using{" "}
              <a
                href={utmLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
