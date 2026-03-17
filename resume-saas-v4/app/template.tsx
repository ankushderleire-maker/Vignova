export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <div className="animate-slide-down w-full h-full">
            {children}
        </div>
    );
}
