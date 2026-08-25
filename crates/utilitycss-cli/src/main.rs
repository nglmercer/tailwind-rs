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
use notify::{Config as NotifyConfig, RecommendedWatcher, RecursiveMode, Watcher};
use utilitycss_compiler::{Compiler, CompilerConfig, SourceInput};
use utilitycss_config::ConfigFile;
use utilitycss_css_ir::CssSerializationMode;
use utilitycss_span::SourceId;
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
    Diagnostics,
}

impl fmt::Display for CliError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Usage(message) => formatter.write_str(message),
            Self::Io { path, source } => write!(formatter, "{}: {source}", path.display()),
            Self::Config(error) => error.fmt(formatter),
            Self::Compiler(error) => error.fmt(formatter),
            Self::Diagnostics => formatter.write_str("compilation failed with diagnostics"),
        }
    }
}

impl Error for CliError {}

#[derive(Clone, Debug, Eq, PartialEq)]
struct Options {
    inputs: Vec<PathBuf>,
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
    if inputs.is_empty() {
        return Err(usage("at least one input file or directory is required"));
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
    let files = collect_files(&options.inputs)?;
    for path in files {
        update_file(&mut compiler, &path)?;
    }
    emit(&mut compiler, options)
}

fn run_watch(options: Options) -> Result<(), CliError> {
    let mut compiler = make_compiler(&options)?;
    let mut known = BTreeMap::<PathBuf, ()>::new();
    refresh_sources(&mut compiler, &options.inputs, &mut known)?;
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
    for input in &options.inputs {
        let mode =
            if input.is_dir() { RecursiveMode::Recursive } else { RecursiveMode::NonRecursive };
        watcher.watch(input, mode).map_err(|error| CliError::Io {
            path: input.clone(),
            source: io::Error::other(error.to_string()),
        })?;
    }
    loop {
        match receiver.recv_timeout(options.interval) {
            Ok(Ok(_event)) => {
                while receiver.try_recv().is_ok() {}
                refresh_sources(&mut compiler, &options.inputs, &mut known)?;
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
    known: &mut BTreeMap<PathBuf, ()>,
) -> Result<(), CliError> {
    let files = collect_files(inputs)?;
    for path in &files {
        update_file(compiler, path)?;
    }
    let current = files.into_iter().map(|path| (path, ())).collect::<BTreeMap<_, _>>();
    let removed =
        known.keys().filter(|path| !current.contains_key(*path)).cloned().collect::<Vec<_>>();
    for path in removed {
        compiler.remove_source(&SourceId::new(path.to_string_lossy().into_owned()));
    }
    *known = current;
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
        CompilerConfig::new().with_theme(file.theme().clone()).with_serialization_mode(mode),
    ))
}

fn update_file(compiler: &mut Compiler, path: &Path) -> Result<(), CliError> {
    let content = fs::read_to_string(path)
        .map_err(|source| CliError::Io { path: path.to_owned(), source })?;
    let source_id = SourceId::new(path.to_string_lossy().into_owned());
    compiler
        .update_source(
            SourceInput::new(source_id, content).with_path(path.to_string_lossy().into_owned()),
        )
        .map_err(CliError::Compiler)
}

fn emit(compiler: &mut Compiler, options: &Options) -> Result<(), CliError> {
    let result = compiler.build();
    if let Some(path) = &options.output {
        fs::write(path, result.css())
            .map_err(|source| CliError::Io { path: path.clone(), source })?;
    } else {
        let mut stdout = io::stdout().lock();
        stdout
            .write_all(result.css().as_bytes())
            .and_then(|_| stdout.write_all(b"\n"))
            .map_err(|source| CliError::Io { path: PathBuf::from("<stdout>"), source })?;
    }
    for diagnostic in result.diagnostics().iter() {
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
    if result.diagnostics().is_empty() {
        Ok(())
    } else {
        Err(CliError::Diagnostics)
    }
}

fn collect_files(inputs: &[PathBuf]) -> Result<Vec<PathBuf>, CliError> {
    let mut files = BTreeMap::new();
    for input in inputs {
        collect_path(input, &mut files)?;
    }
    Ok(files.into_keys().collect())
}

fn collect_path(path: &Path, files: &mut BTreeMap<PathBuf, ()>) -> Result<(), CliError> {
    for entry in WalkDir::new(path).follow_links(false) {
        let entry = entry.map_err(|error| CliError::Io {
            path: error.path().map_or_else(|| path.to_owned(), Path::to_owned),
            source: io::Error::other(error.to_string()),
        })?;
        if entry.file_type().is_file() {
            files.insert(entry.path().to_owned(), ());
        }
    }
    Ok(())
}

fn usage(message: impl Into<String>) -> CliError {
    CliError::Usage(message.into())
}

fn print_help() {
    println!("{}", Cli::command().render_help());
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use super::{parse_options, run, CssSerializationMode};

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
}
