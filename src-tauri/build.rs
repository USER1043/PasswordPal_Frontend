use std::{env, fs, path::Path};

#[path = "build_support/backend_scope.rs"]
mod backend_scope;

/// Writes `capabilities/backend-url.json` so the app may call the configured backend.
/// Must run before `tauri_build::build()`, which reads the capabilities directory.
fn write_backend_capability() {
    use backend_scope::{allowed_origin, capability_json, resolve_backend_url, BACKEND_URL_VAR};

    // Rebuild when the URL (or the files it may come from) changes.
    println!("cargo:rerun-if-env-changed={BACKEND_URL_VAR}");
    println!("cargo:rerun-if-changed=build_support/backend_scope.rs");
    for file in ["../.env.local", "../.env"] {
        println!("cargo:rerun-if-changed={file}");
    }

    // Same sources and order as Vite: process environment, .env.local, .env
    let dotenv_files: Vec<String> = [".env.local", ".env"]
        .iter()
        .filter_map(|name| fs::read_to_string(Path::new("..").join(name)).ok())
        .collect();
    let url = resolve_backend_url(env::var(BACKEND_URL_VAR).ok(), &dotenv_files);

    let origin = allowed_origin(&url).unwrap_or_else(|e| panic!("{e}"));
    if origin == backend_scope::DEFAULT_BACKEND_URL
        && env::var("PROFILE").is_ok_and(|p| p == "release")
    {
        println!(
            "cargo:warning={BACKEND_URL_VAR} is not set: this release build can only reach {origin}"
        );
    }

    let path = Path::new("capabilities/backend-url.json");
    let contents = capability_json(&origin);
    // Only touch the file when it changes, so the build does not retrigger itself
    if fs::read_to_string(path).ok().as_deref() != Some(contents.as_str()) {
        fs::write(path, contents).expect("failed to write capabilities/backend-url.json");
    }
}

fn main() {
    write_backend_capability();
    tauri_build::build()
}
