"use client";

export function Pager({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);

  if (pageCount <= 1) return null;

  return (
    <nav className="pager" aria-label="Pagination">
      <button
        className="secondary-button compact-button"
        type="button"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <span>
        Page {page + 1} of {pageCount}
      </span>
      <button
        className="secondary-button compact-button"
        type="button"
        disabled={page >= pageCount - 1}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
