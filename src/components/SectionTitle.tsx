interface SectionTitleProps {
  title: string;
  subtitle?: string;
  accent?: string;
  align?: "left" | "center";
}

export function SectionTitle({ title, subtitle, accent, align = "center" }: SectionTitleProps) {
  return (
    <div className={`mb-12 ${align === "center" ? "text-center" : ""}`}>
      {accent && (
        <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-[#f4c430] mb-3">
          {accent}
        </span>
      )}
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight" style={{ fontFamily: "'Orbitron', sans-serif" }}>
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">{subtitle}</p>
      )}
    </div>
  );
}
