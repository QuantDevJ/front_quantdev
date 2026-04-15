"use client";

import { Button } from "@/components/ui/button";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
};

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    const showEllipsisStart = currentPage > 3;
    const showEllipsisEnd = currentPage < totalPages - 2;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (showEllipsisStart) {
        pages.push("...");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }

      if (showEllipsisEnd) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const startItem = totalItems && itemsPerPage
    ? (currentPage - 1) * itemsPerPage + 1
    : null;
  const endItem = totalItems && itemsPerPage
    ? Math.min(currentPage * itemsPerPage, totalItems)
    : null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
      {totalItems !== undefined && (
        <p className="text-sm text-[#737373]">
          Showing {startItem}-{endItem} of {totalItems} items
        </p>
      )}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 px-3 text-xs"
        >
          Previous
        </Button>

        {getPageNumbers().map((page, idx) => (
          page === "..." ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-[#737373]">
              ...
            </span>
          ) : (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              className={`h-8 w-8 p-0 text-xs ${
                currentPage === page
                  ? "bg-[#0057FF] text-white hover:bg-[#0057FF]/90"
                  : ""
              }`}
            >
              {page}
            </Button>
          )
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 px-3 text-xs"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
