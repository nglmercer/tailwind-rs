#![allow(missing_docs)]

use serde::Deserialize;
use utilitycss_compiler::{Compiler, CompilerConfig, SourceInput};
use utilitycss_span::SourceId;

#[derive(Debug, Deserialize)]
struct Fixture {
    sources: Vec<FixtureSource>,
    expected_css: String,
    expected_diagnostics: Vec<FixtureDiagnostic>,
}

#[derive(Debug, Deserialize)]
struct FixtureSource {
    id: String,
    content: String,
}

#[derive(Debug, Deserialize, PartialEq, Eq)]
struct FixtureDiagnostic {
    code: String,
    source: String,
    start: u32,
    end: u32,
}

fn run_fixture(input: &str) {
    let fixture: Fixture = serde_json::from_str(input).expect("fixture is valid JSON");
    let mut compiler = Compiler::new(CompilerConfig::new());
    for source in fixture.sources {
        compiler
            .update_source(SourceInput::new(SourceId::new(source.id), source.content))
            .expect("fixture source is valid");
    }

    let output = compiler.build();
    assert_eq!(output.css(), fixture.expected_css);

    let diagnostics = output
        .diagnostics()
        .iter()
        .map(|diagnostic| FixtureDiagnostic {
            code: diagnostic.code().as_str().to_owned(),
            source: diagnostic.source().expect("fixture diagnostic has source").as_str().to_owned(),
            start: diagnostic.span().expect("fixture diagnostic has span").start(),
            end: diagnostic.span().expect("fixture diagnostic has span").end(),
        })
        .collect::<Vec<_>>();
    assert_eq!(diagnostics, fixture.expected_diagnostics);
}

#[test]
fn basic_utility_fixture() {
    run_fixture(include_str!("fixtures/basic.json"));
}

#[test]
fn variant_and_arbitrary_value_fixture() {
    run_fixture(include_str!("fixtures/variants.json"));
}

#[test]
fn duplicate_occurrences_fixture() {
    run_fixture(include_str!("fixtures/duplicates.json"));
}

#[test]
fn diagnostic_fixture() {
    run_fixture(include_str!("fixtures/diagnostics.json"));
}
