export function PaginationDemo() {
  return (
    <nav aria-label="Page navigation" className="flex items-center justify-between">
      <span className="text-sm text-gray-700">Showing <strong>1–10</strong> of <strong>45</strong></span>
      <div className="inline-flex -space-x-px rounded-lg border border-gray-200 bg-white">
        <a className="pagination-link pagination-link-first" href="#">Previous</a>
        <a className="pagination-link pagination-link-active" href="#" aria-current="page">1</a>
        <a className="pagination-link" href="#">2</a>
        <a className="pagination-link" href="#">3</a>
        <a className="pagination-link pagination-link-last" href="#">Next</a>
      </div>
    </nav>
  );
}
