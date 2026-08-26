//! Native command-line adapter for the utilitycss compiler.

#![forbid(unsafe_code)]

use std::{
    collections::BTreeMap,
    env,
    error::Error,
    fmt, fs,
    io::{self, Write},
    path::{Path, PathBuf},
    sync::mpsc,
    time::Duration,
};

use clap::{Args, CommandFactory, Parser, Subcommand};
use notify::{Config as NotifyConfig, Event, RecommendedWatcher, RecursiveMode, Watcher};
use utilitycss_compiler::{Compiler, CompilerConfig, SourceInput};
use utilitycss_config::ConfigFile;
use utilitycss_css_ir::CssSerializationMode;
use utilitycss_extractor::{extract_for_framework, Framework};
use utilitycss_span::SourceId;
use utilitycss_stylesheet::{transform_stylesheet, StylesheetInput};
use utilitycss_swc::{extract as extract_swc, SourceKind as SwcSourceKind};
use walkdir::WalkDir;

fn main() {
    if let Err(error) = run(env::args().skip(1)) {
        eprintln!("utilitycss: {error}");
        std::process::exit(1);
    }
}

#[derive(Debug)]
enum CliError {
    Usage(String),
    Io { path: PathBuf, source: io::Error },
    Config(utilitycss_config::ConfigError),
    Compiler(utilitycss_compiler::CompilerError),
    Extraction(String),
    Diagnostics,
}

impl fmt::Display for CliError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Usage(message) => formatter.write_str(message),
            Self::Io { path, source } => write!(formatter, "{}: {source}", path.display()),
            Self::Config(error) => error.fmt(formatter),
            Self::Compiler(error) => error.fmt(formatter),
            Self::Extraction(message) => write!(formatter, "source extraction failed: {message}"),
            Self::Diagnostics => formatter.write_str("compilation failed with diagnostics"),
        }
    }
}

impl Error for CliError {}

#[derive(Clone, Debug, Eq, PartialEq)]
struct Options {
    inputs: Vec<PathBuf>,
    stylesheet_inputs: Vec<PathBuf>,
    output: Option<PathBuf>,
    mode: Option<CssSerializationMode>,
    config: Option<PathBuf>,
    stats: bool,
    watch: bool,
    once: bool,
    interval: Duration,
}

#[derive(Clone, Debug, Parser)]
#[command(name = "utilitycss", about = "Build deterministic utility CSS from source files.")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Clone, Debug, Subcommand)]
enum Command {
    /// Build once and write CSS.
    Build(CommonArgs),
    /// Watch inputs and rebuild when files change.
    Watch(WatchArgs),
}

#[derive(Clone, Debug, Args)]
struct CommonArgs {
    /// Add an input file or directory.
    #[arg(short = 'i', long = "input", value_name = "PATH")]
    input_flags: Vec<PathBuf>,
    /// Add an authored CSS stylesheet to transform with @apply.
    #[arg(long = "stylesheet", value_name = "PATH")]
    stylesheet_flags: Vec<PathBuf>,
    /// Write CSS to a file instead of stdout.
    #[arg(short, long, value_name = "PATH")]
    output: Option<PathBuf>,
    /// Read declarative JSON configuration.
    #[arg(long, value_name = "PATH")]
    config: Option<PathBuf>,
    /// Use readable CSS formatting.
    #[arg(long, conflicts_with = "minify")]
    pretty: bool,
    /// Use compact CSS formatting.
    #[arg(long, conflicts_with = "pretty")]
    minify: bool,
    /// Print compiler counters to stderr.
    #[arg(long)]
    stats: bool,
    /// Positional input files or directories.
    #[arg(value_name = "INPUT")]
    positional_inputs: Vec<PathBuf>,
}

#[derive(Clone, Debug, Args)]
struct WatchArgs {
    #[command(flatten)]
    common: CommonArgs,
    /// Run one watch iteration and exit.
    #[arg(long)]
    once: bool,
    /// Polling interval in milliseconds.
    #[arg(long, default_value_t = 250, value_name = "N")]
    interval_ms: u64,
}

fn run<I>(arguments: I) -> Result<(), CliError>
where
    I: IntoIterator,
    I::Item: Into<String>,
{
    let mut arguments = arguments.into_iter().map(Into::into).collect::<Vec<_>>();
    if arguments.first().is_some_and(|argument| argument == "help" || argument == "--help") {
        print_help();
        return Ok(());
    }
    let watch = arguments.first().is_some_and(|argument| argument == "watch");
    if watch || arguments.first().is_some_and(|argument| argument == "build") {
        arguments.remove(0);
    }
    let options = parse_options(arguments, watch)?;
    if options.watch {
        run_watch(options)
    } else {
        run_build(&options)
    }
}

fn parse_options(arguments: Vec<String>, watch: bool) -> Result<Options, CliError> {
    let command = if watch { "watch" } else { "build" };
    let arguments = std::iter::once("utilitycss".to_owned())
        .chain(std::iter::once(command.to_owned()))
        .chain(arguments)
        .collect::<Vec<_>>();
    let cli = Cli::try_parse_from(arguments).map_err(|error| usage(error.to_string()))?;
    let (common, once, interval) = match cli.command {
        Command::Build(common) => (common, false, Duration::from_millis(250)),
        Command::Watch(watch) => {
            (watch.common, watch.once, Duration::from_millis(watch.interval_ms.max(1)))
        }
    };
    let mut inputs = common.positional_inputs;
    inputs.extend(common.input_flags);
    if inputs.is_empty() && common.stylesheet_flags.is_empty() {
        return Err(usage("at least one source input or --stylesheet path is required"));
    }
    let mode = if common.pretty {
        Some(CssSerializationMode::Pretty)
    } else if common.minify {
        Some(CssSerializationMode::Minified)
    } else {
        None
    };
    Ok(Options {
        inputs,
        stylesheet_inputs: common.stylesheet_flags,
        output: common.output,
        mode,
        config: common.config,
        stats: common.stats,
        watch,
        once,
        interval,
    })
}

fn run_build(options: &Options) -> Result<(), CliError> {
    let mut compiler = make_compiler(options)?;
    let files = collect_files(&options.inputs, options.output.as_deref())?;
    for path in files {
        if !is_stylesheet(&path) {
            update_file(&mut compiler, &path)?;
        }
    }
    emit(&mut compiler, options)
}

fn run_watch(options: Options) -> Result<(), CliError> {
    let mut compiler = make_compiler(&options)?;
    let mut known = BTreeMap::<PathBuf, ()>::new();
    refresh_sources(&mut compiler, &options.inputs, options.output.as_deref(), &mut known)?;
    emit(&mut compiler, &options)?;
    if options.once {
        return Ok(());
    }

    let (sender, receiver) = mpsc::channel();
    let mut watcher = RecommendedWatcher::new(
        move |event| {
            let _ = sender.send(event);
        },
        NotifyConfig::default().with_poll_interval(options.interval),
    )
    .map_err(|error| CliError::Usage(format!("could not start file watcher: {error}")))?;
    for input in options.inputs.iter().chain(options.stylesheet_inputs.iter()) {
        let mode =
            if input.is_dir() { RecursiveMode::Recursive } else { RecursiveMode::NonRecursive };
        watcher.watch(input, mode).map_err(|error| CliError::Io {
            path: input.clone(),
            source: io::Error::other(error.to_string()),
        })?;
    }
    loop {
        match receiver.recv_timeout(options.interval) {
            Ok(Ok(event)) => {
                let mut events = vec![event];
                while let Ok(result) = receiver.try_recv() {
                    match result {
                        Ok(event) => events.push(event),
                        Err(error) => {
                            return Err(CliError::Usage(format!("file watcher error: {error}")))
                        }
                    }
                }
                for event in events {
                    apply_watch_event(
                        &mut compiler,
                        &event,
                        options.output.as_deref(),
                        &mut known,
                    )?;
                }
                emit(&mut compiler, &options)?;
            }
            Ok(Err(error)) => return Err(CliError::Usage(format!("file watcher error: {error}"))),
            Err(mpsc::RecvTimeoutError::Timeout) => {}
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                return Err(CliError::Usage("file watcher stopped unexpectedly".to_owned()))
            }
        }
    }
}

fn refresh_sources(
    compiler: &mut Compiler,
    inputs: &[PathBuf],
    output: Option<&Path>,
    known: &mut BTreeMap<PathBuf, ()>,
) -> Result<(), CliError> {
    let files = collect_files(inputs, output)?;
    for path in &files {
        if !is_stylesheet(path) {
            update_file(compiler, path)?;
        }
    }
    let current = files
        .into_iter()
        .filter(|path| !is_stylesheet(path))
        .map(|path| (path, ()))
        .collect::<BTreeMap<_, _>>();
    let removed =
        known.keys().filter(|path| !current.contains_key(*path)).cloned().collect::<Vec<_>>();
    for path in removed {
        compiler.remove_source(&SourceId::new(source_id(&path)));
    }
    *known = current;
    Ok(())
}

fn apply_watch_event(
    compiler: &mut Compiler,
    event: &Event,
    output: Option<&Path>,
    known: &mut BTreeMap<PathBuf, ()>,
) -> Result<(), CliError> {
    if event.paths.is_empty() {
        return Ok(());
    }

    for path in &event.paths {
        let key = stable_path(path);
        let output_key = output.map(stable_path);
        let is_output = output_key.as_ref().is_some_and(|output| output == &key);
        let is_file = path.is_file();
        let is_supported = is_supported_source(path);

        if is_stylesheet(path) {
            continue;
        }

        if is_output || !is_supported || !is_file {
            let removed = known
                .keys()
                .filter(|known_path| {
                    known_path.as_path() == key.as_path() || known_path.starts_with(&key)
                })
                .cloned()
                .collect::<Vec<_>>();
            for removed_path in removed {
                known.remove(&removed_path);
                compiler.remove_source(&SourceId::new(source_id(&removed_path)));
            }
            continue;
        }

        update_file(compiler, &key)?;
        known.insert(key, ());
    }

    Ok(())
}

fn make_compiler(options: &Options) -> Result<Compiler, CliError> {
    let file = options
        .config
        .as_ref()
        .map_or_else(|| Ok(ConfigFile::default()), utilitycss_config::load)
        .map_err(CliError::Config)?;
    let mode = options.mode.unwrap_or(file.serialization_mode());
    Ok(Compiler::new(
        CompilerConfig::new()
            .with_theme(file.theme().clone())
            .with_utility_registry(file.utilities().clone())
            .with_variant_registry(file.variants().clone())
            .with_serialization_mode(mode),
    ))
}

fn update_file(compiler: &mut Compiler, path: &Path) -> Result<(), CliError> {
    let content = fs::read_to_string(path)
        .map_err(|source| CliError::Io { path: path.to_owned(), source })?;
    let stable_source_id = source_id(path);
    let source_id = SourceId::new(stable_source_id.clone());
    let candidates = extract_candidates(path, &content)?;
    compiler
        .update_source_with_candidates(
            SourceInput::new(source_id, content).with_path(stable_source_id),
            candidates,
        )
        .map_err(CliError::Compiler)
}

fn extract_candidates(
    path: &Path,
    content: &str,
) -> Result<Vec<utilitycss_compiler::CandidateInput>, CliError> {
    let extension =
        path.extension().and_then(|extension| extension.to_str()).map(str::to_ascii_lowercase);
    let candidates = match extension.as_deref() {
        Some("js") | Some("mjs") | Some("cjs") => extract_swc(content, SwcSourceKind::JavaScript)
            .map_err(|error| CliError::Extraction(error.to_string()))?
            .into_iter()
            .map(|candidate| (candidate.raw(), candidate.span()))
            .collect::<Vec<_>>(),
        Some("jsx") | Some("mjsx") | Some("cjsx") => extract_swc(content, SwcSourceKind::Jsx)
            .map_err(|error| CliError::Extraction(error.to_string()))?
            .into_iter()
            .map(|candidate| (candidate.raw(), candidate.span()))
            .collect::<Vec<_>>(),
        Some("ts") | Some("mts") | Some("cts") => extract_swc(content, SwcSourceKind::TypeScript)
            .map_err(|error| CliError::Extraction(error.to_string()))?
            .into_iter()
            .map(|candidate| (candidate.raw(), candidate.span()))
            .collect::<Vec<_>>(),
        Some("tsx") | Some("mtsx") | Some("ctsx") => extract_swc(content, SwcSourceKind::Tsx)
            .map_err(|error| CliError::Extraction(error.to_string()))?
            .into_iter()
            .map(|candidate| (candidate.raw(), candidate.span()))
            .collect::<Vec<_>>(),
        Some("vue") => extract_for_framework(content, Framework::Vue)
            .into_iter()
            .map(|candidate| (candidate.raw(), candidate.span()))
            .collect::<Vec<_>>(),
        Some("svelte") => extract_for_framework(content, Framework::Svelte)
            .into_iter()
            .map(|candidate| (candidate.raw(), candidate.span()))
            .collect::<Vec<_>>(),
        Some("astro") => extract_for_framework(content, Framework::Astro)
            .into_iter()
            .map(|candidate| (candidate.raw(), candidate.span()))
            .collect::<Vec<_>>(),
        _ => extract_for_framework(content, Framework::Html)
            .into_iter()
            .map(|candidate| (candidate.raw(), candidate.span()))
            .collect::<Vec<_>>(),
    };
    Ok(candidates
        .into_iter()
        .map(|(raw, span)| utilitycss_compiler::CandidateInput::new(raw, span))
        .collect())
}

fn emit(compiler: &mut Compiler, options: &Options) -> Result<(), CliError> {
    let result = compiler.build();
    let stylesheet = transform_authored_stylesheets(compiler, options)?;
    let mode = compiler.config().serialization_mode();
    let separator = if mode == CssSerializationMode::Pretty { "\n" } else { "" };
    let css = if stylesheet.css.is_empty() {
        result.css().to_owned()
    } else if result.css().is_empty() {
        stylesheet.css.clone()
    } else {
        format!("{}{separator}{}", stylesheet.css, result.css())
    };
    if let Some(path) = &options.output {
        fs::write(path, css.as_bytes())
            .map_err(|source| CliError::Io { path: path.clone(), source })?;
    } else {
        let mut stdout = io::stdout().lock();
        stdout
            .write_all(css.as_bytes())
            .and_then(|_| stdout.write_all(b"\n"))
            .map_err(|source| CliError::Io { path: PathBuf::from("<stdout>"), source })?;
    }
    for diagnostic in result.diagnostics().iter().chain(stylesheet.diagnostics.iter()) {
        let source = diagnostic.source().map_or_else(|| "<source>".to_owned(), ToString::to_string);
        let span = diagnostic
            .span()
            .map_or_else(String::new, |span| format!(":{}..{}", span.start(), span.end()));
        eprintln!("{}{}: {} [{}]", source, span, diagnostic.message(), diagnostic.code());
        if let Some(help) = diagnostic.help() {
            eprintln!("  help: {help}");
        }
    }
    if options.stats {
        let stats = result.stats();
        eprintln!(
            "stats: sources_scanned={} bytes_scanned={} candidates_found={} unique_candidates={} candidates_parsed={} cache_hits={} rules_generated={} rules_removed={}",
            stats.sources_scanned(),
            stats.bytes_scanned(),
            stats.candidates_found(),
            stats.unique_candidates(),
            stats.candidates_parsed(),
            stats.cache_hits(),
            stats.rules_generated(),
            stats.rules_removed(),
        );
    }
    if result.diagnostics().is_empty() && stylesheet.diagnostics.is_empty() {
        Ok(())
    } else {
        Err(CliError::Diagnostics)
    }
}

struct AuthoredStylesheetOutput {
    css: String,
    diagnostics: Vec<utilitycss_diagnostics::Diagnostic>,
}

fn transform_authored_stylesheets(
    compiler: &mut Compiler,
    options: &Options,
) -> Result<AuthoredStylesheetOutput, CliError> {
    let mut paths = collect_files(&options.inputs, options.output.as_deref())?;
    paths.extend(collect_files(&options.stylesheet_inputs, options.output.as_deref())?);
    paths.sort();
    paths.dedup();

    let mode = compiler.config().serialization_mode();
    let separator = if mode == CssSerializationMode::Pretty { "\n" } else { "" };
    let mut css = String::new();
    let mut diagnostics = Vec::new();
    for path in paths.into_iter().filter(|path| is_stylesheet(path)) {
        let content = fs::read_to_string(&path)
            .map_err(|source| CliError::Io { path: path.clone(), source })?;
        let source_id = source_id(&path);
        let output = transform_stylesheet(
            compiler,
            StylesheetInput::new(SourceId::new(source_id.clone()), content).with_path(source_id),
        );
        if !css.is_empty() {
            css.push_str(separator);
        }
        css.push_str(output.css());
        diagnostics.extend(output.diagnostics().iter().cloned());
    }
    Ok(AuthoredStylesheetOutput { css, diagnostics })
}

fn collect_files(inputs: &[PathBuf], output: Option<&Path>) -> Result<Vec<PathBuf>, CliError> {
    let mut files = BTreeMap::new();
    for input in inputs {
        collect_path(input, output, &mut files)?;
    }
    Ok(files.into_keys().collect())
}

fn collect_path(
    path: &Path,
    output: Option<&Path>,
    files: &mut BTreeMap<PathBuf, ()>,
) -> Result<(), CliError> {
    let output = output.map(stable_path);
    let mut entries = WalkDir::new(path).follow_links(false).into_iter();
    while let Some(entry) = entries.next() {
        let entry = entry.map_err(|error| CliError::Io {
            path: error.path().map_or_else(|| path.to_owned(), Path::to_owned),
            source: io::Error::other(error.to_string()),
        })?;
        if entry.file_type().is_dir() && is_ignored_directory(entry.path()) {
            entries.skip_current_dir();
            continue;
        }
        if entry.file_type().is_file()
            && is_supported_source(entry.path())
            && output.as_ref().is_none_or(|output| stable_path(entry.path()) != *output)
        {
            files.insert(stable_path(entry.path()), ());
        }
    }
    Ok(())
}

fn is_supported_source(path: &Path) -> bool {
    let Some(extension) = path.extension().and_then(|extension| extension.to_str()) else {
        return false;
    };
    matches!(
        extension.to_ascii_lowercase().as_str(),
        "html"
            | "htm"
            | "js"
            | "mjs"
            | "cjs"
            | "jsx"
            | "mjsx"
            | "cjsx"
            | "ts"
            | "mts"
            | "cts"
            | "tsx"
            | "mtsx"
            | "ctsx"
            | "vue"
            | "svelte"
            | "astro"
            | "css"
    )
}

fn is_stylesheet(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("css"))
}

fn is_ignored_directory(path: &Path) -> bool {
    path.components().any(|component| {
        let name = component.as_os_str().to_string_lossy();
        matches!(
            name.to_ascii_lowercase().as_str(),
            ".git"
                | "node_modules"
                | "target"
                | "dist"
                | "build"
                | "coverage"
                | ".next"
                | ".nuxt"
                | ".svelte-kit"
        )
    })
}

fn stable_path(path: &Path) -> PathBuf {
    fs::canonicalize(path).unwrap_or_else(|_| {
        if path.is_absolute() {
            path.to_owned()
        } else {
            env::current_dir().map_or_else(|_| path.to_owned(), |current| current.join(path))
        }
    })
}

fn source_id(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

fn usage(message: impl Into<String>) -> CliError {
    CliError::Usage(message.into())
}

fn print_help() {
    println!("{}", Cli::command().render_help());
}

#[cfg(test)]
mod tests {
    use std::{
        fs,
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    use super::{
        collect_files, parse_options, run, stable_path, transform_authored_stylesheets, Compiler,
        CompilerConfig, CssSerializationMode, Options,
    };

    #[test]
    fn parses_build_options_and_positional_inputs() {
        let options = parse_options(vec!["--pretty".into(), "src".into(), "--stats".into()], false)
            .expect("options are valid");

        assert_eq!(options.inputs, vec![PathBuf::from("src")]);
        assert_eq!(options.mode, Some(CssSerializationMode::Pretty));
        assert!(options.stats);
        assert!(!options.watch);
    }

    #[test]
    fn help_is_available_without_a_workspace() {
        run(["help".to_owned()]).expect("help does not require inputs");
    }

    #[test]
    fn collection_skips_binary_and_generated_directories_and_output_files() {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock is after the Unix epoch")
            .as_nanos();
        let root = std::env::temp_dir().join(format!("utilitycss-cli-{suffix}"));
        let output = root.join("src/generated.html");
        fs::create_dir_all(root.join("src")).expect("test source directory is created");
        fs::create_dir_all(root.join("node_modules/pkg")).expect("ignored directory is created");
        fs::create_dir_all(root.join("target")).expect("ignored directory is created");
        fs::write(root.join("src/input.html"), "<div class=\"p-4\"></div>")
            .expect("source is written");
        fs::write(&output, "p-4{padding:1rem}").expect("generated output is written");
        fs::write(root.join("src/image.bin"), [0_u8, 159, 146, 150]).expect("binary is written");
        fs::write(root.join("node_modules/pkg/ignored.html"), "p-8")
            .expect("ignored source is written");
        fs::write(root.join("target/ignored.html"), "p-8").expect("ignored source is written");

        let files =
            collect_files(std::slice::from_ref(&root), Some(&output)).expect("collection succeeds");
        assert_eq!(files, vec![stable_path(&root.join("src/input.html"))]);

        fs::remove_dir_all(root).expect("test directory is removed");
    }

    #[test]
    fn transforms_css_inputs_separately_from_candidate_sources() {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock is after the Unix epoch")
            .as_nanos();
        let root = std::env::temp_dir().join(format!("utilitycss-cli-stylesheet-{suffix}"));
        fs::create_dir_all(&root).expect("test directory is created");
        let stylesheet = root.join("app.css");
        fs::write(&stylesheet, ".button { @apply flex p-4; }").expect("stylesheet is written");
        let options = Options {
            inputs: Vec::new(),
            stylesheet_inputs: vec![stylesheet],
            output: None,
            mode: Some(CssSerializationMode::Minified),
            config: None,
            stats: false,
            watch: false,
            once: false,
            interval: std::time::Duration::from_millis(250),
        };
        let mut compiler = Compiler::new(CompilerConfig::new());

        let output = transform_authored_stylesheets(&mut compiler, &options)
            .expect("stylesheet transformation succeeds");

        assert_eq!(output.css, ".button{display:flex;padding:1rem;}");
        assert!(output.diagnostics.is_empty());
        assert_eq!(compiler.source_count(), 0);
        fs::remove_dir_all(root).expect("test directory is removed");
    }
}
