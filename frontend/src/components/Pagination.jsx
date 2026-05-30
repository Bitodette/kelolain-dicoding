import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

export default function Pagination({ page, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    return (
        <div className="flex items-center justify-center gap-1 mt-6">
            <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="p-2 rounded-xl border border-[#E6E8EC] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
                <ChevronLeftIcon className="w-4 h-4 text-[#6B7280]" />
            </button>

            {start > 1 && (
                <>
                    <button
                        type="button"
                        onClick={() => onPageChange(1)}
                        className="min-w-[36px] h-9 rounded-xl text-sm font-semibold text-[#6B7280] hover:bg-gray-50 transition-colors"
                    >
                        1
                    </button>
                    {start > 2 && <span className="px-1 text-[#8B95A7]">...</span>}
                </>
            )}

            {pages.map((p) => (
                <button
                    key={p}
                    type="button"
                    onClick={() => onPageChange(p)}
                    className={`min-w-[36px] h-9 rounded-xl text-sm font-semibold transition-colors ${
                        p === page
                            ? "bg-[#2936C4] text-white"
                            : "text-[#6B7280] hover:bg-gray-50"
                    }`}
                >
                    {p}
                </button>
            ))}

            {end < totalPages && (
                <>
                    {end < totalPages - 1 && <span className="px-1 text-[#8B95A7]">...</span>}
                    <button
                        type="button"
                        onClick={() => onPageChange(totalPages)}
                        className="min-w-[36px] h-9 rounded-xl text-sm font-semibold text-[#6B7280] hover:bg-gray-50 transition-colors"
                    >
                        {totalPages}
                    </button>
                </>
            )}

            <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-2 rounded-xl border border-[#E6E8EC] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
                <ChevronRightIcon className="w-4 h-4 text-[#6B7280]" />
            </button>
        </div>
    );
}
