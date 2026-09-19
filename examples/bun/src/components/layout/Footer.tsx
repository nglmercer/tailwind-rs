const columns: readonly { title: string; links: readonly string[] }[] = [
  { title: "Product", links: ["Compiler", "Adapters", "Changelog"] },
  { title: "Resources", links: ["Documentation", "Class DSL", "Migration guide"] },
  { title: "Company", links: ["About", "Blog", "Contact"] }
];

/** Multi-column page footer with brand block and link groups. */
export function FooterDemo() {
  return (
    <footer className="footer-demo">
      <div className="footer-brand">
        <span className="brand-mark">u</span>
        <div>
          <strong>utilitycss</strong>
          <p>Deterministic utility CSS, compiled in Rust.</p>
        </div>
      </div>
      {columns.map(column => (
        <nav key={column.title} aria-label={column.title}>
          <p className="footer-title">{column.title}</p>
          <ul className="footer-links">
            {column.links.map(link => <li key={link}><a href="#">{link}</a></li>)}
          </ul>
        </nav>
      ))}
    </footer>
  );
}
