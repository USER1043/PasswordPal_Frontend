// ============================================================================
// AppLogo — Reusable PasswordPal branding component
// ============================================================================

interface AppLogoProps {
    size?: "sm" | "md" | "lg";
    showText?: boolean;
}

export default function AppLogo({ size = "md", showText = true }: AppLogoProps) {
    const imgClass = {
        sm: "max-h-8",
        md: "max-h-12",
        lg: "max-h-16",
    }[size];

    const textClass = {
        sm: "text-lg",
        md: "text-xl",
        lg: "text-2xl",
    }[size];

    return (
        <div className="flex items-center gap-3">
            <img
                src="/logo.jpg"
                alt="PasswordPal Logo"
                className={`object-contain rounded-xl shadow-lg shadow-purple-500/20 ${imgClass}`}
            />
            {showText && (
                <span className={`${textClass} font-bold text-white tracking-tight`}>
                    PasswordPal
                </span>
            )}
        </div>
    );
}
