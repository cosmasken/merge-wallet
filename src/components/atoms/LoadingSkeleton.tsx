interface LoadingSkeletonProps {
    className?: string;
    variant?: "text" | "circle" | "rectangle";
    width?: string;
    height?: string;
}

export default function LoadingSkeleton({
    className = "",
    variant = "rectangle",
    width,
    height
}: LoadingSkeletonProps) {
    const baseClasses = "bg-neutral-200 dark:bg-neutral-700 animate-pulse";

    const variantClasses = {
        text: "rounded",
        circle: "rounded-full",
        rectangle: "rounded-lg"
    };

    const style = {
        ...(width && { width }),
        ...(height && { height })
    };

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            style={style}
        />
    );
}

// Preset skeleton components for common use cases
export function TokenSkeleton() {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-3">
                <LoadingSkeleton variant="circle" className="w-8 h-8" />
                <div className="flex flex-col gap-1">
                    <LoadingSkeleton variant="text" className="w-20 h-4" />
                    <LoadingSkeleton variant="text" className="w-12 h-3" />
                </div>
            </div>
            <LoadingSkeleton variant="text" className="w-16 h-4" />
        </div>
    );
}

export function TransactionSkeleton() {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <LoadingSkeleton variant="text" className="w-12 h-5" />
                    <LoadingSkeleton variant="text" className="w-16 h-4" />
                </div>
                <LoadingSkeleton variant="text" className="w-32 h-3" />
            </div>
            <div className="text-right">
                <LoadingSkeleton variant="text" className="w-20 h-4 mb-1" />
                <LoadingSkeleton variant="text" className="w-16 h-3" />
            </div>
        </div>
    );
}