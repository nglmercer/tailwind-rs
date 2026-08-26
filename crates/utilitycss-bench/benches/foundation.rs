//! Dependency-free benchmark for Phase 0 foundation types.

use std::hint::black_box;
use std::time::Instant;

use utilitycss_scanner::scan;
use utilitycss_span::Span;
use utilitycss_swc::{extract as extract_swc, SourceKind};
use utilitycss_syntax::parse;

fn main() {
    const ITERATIONS: u32 = 100_000;

    benchmark_spans(ITERATIONS);
    benchmark_scan_and_parse(ITERATIONS);
    benchmark_swc_extraction(ITERATIONS / 10);
}

fn benchmark_swc_extraction(iterations: u32) {
    let source = r#"
        export const Card = ({ active }) => (
            <article className={clsx("flex", active && "p-4", `text-${tone}`)} />
        );
    "#;
    let started = Instant::now();
    let mut extracted = 0_u64;
    for _ in 0..iterations {
        let candidates =
            extract_swc(black_box(source), SourceKind::Jsx).expect("benchmark source is valid JSX");
        extracted = extracted.wrapping_add(candidates.len() as u64);
    }
    let elapsed = started.elapsed();
    println!("swc extraction: {iterations} iterations in {elapsed:?} (candidates={extracted})");
}

fn benchmark_spans(iterations: u32) {
    let started = Instant::now();
    let mut checksum = 0_u64;
    for index in 0..iterations {
        let span = Span::new(index, index + 12).expect("benchmark span is ordered");
        checksum = checksum.wrapping_add(u64::from(black_box(span.len())));
    }

    let elapsed = started.elapsed();
    println!("span construction: {iterations} iterations in {elapsed:?} (checksum={checksum})");
}

fn benchmark_scan_and_parse(iterations: u32) {
    let source = r#"<div class="flex gap-4 p-4 hover:bg-red-500/50 md:grid"></div>"#;
    let started = Instant::now();
    let mut scanned = 0_u64;
    let mut parsed = 0_u64;

    for _ in 0..iterations {
        let tokens = scan(black_box(source));
        scanned = scanned.wrapping_add(tokens.len() as u64);
        for token in tokens {
            if parse(black_box(token.raw())).is_ok() {
                parsed = parsed.wrapping_add(1);
            }
        }
    }

    let elapsed = started.elapsed();
    println!(
        "scan+parse: {iterations} iterations in {elapsed:?} (scanned={scanned}, parsed={parsed})"
    );
}
