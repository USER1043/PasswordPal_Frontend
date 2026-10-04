// Tests for the logic build.rs uses to turn VITE_BACKEND_URL into a Tauri capability.
// build.rs cannot be unit-tested directly, so this includes the same source file.

#[path = "../build_support/backend_scope.rs"]
mod backend_scope;

use backend_scope::{
    allowed_origin, capability_json, dotenv_value, resolve_backend_url, DEFAULT_BACKEND_URL,
};

#[test]
fn origin_keeps_scheme_host_and_port_and_drops_the_path() {
    assert_eq!(
        allowed_origin("https://my-backend.onrender.com").unwrap(),
        "https://my-backend.onrender.com"
    );
    assert_eq!(
        allowed_origin("  https://my-backend.onrender.com/api/v1?x=1#y \n").unwrap(),
        "https://my-backend.onrender.com"
    );
    assert_eq!(
        allowed_origin("http://localhost:3000/").unwrap(),
        "http://localhost:3000"
    );
}

#[test]
fn origin_rejects_anything_that_is_not_a_plain_http_url() {
    for bad in [
        "",
        "ftp://example.com",
        "example.com",
        "https://",
        "https://user:pw@example.com",
        "https://exa mple.com",
        r#"https://example.com"/*"},{"url":"https://evil.com"#,
        "https://example.com\\evil",
    ] {
        assert!(allowed_origin(bad).is_err(), "should reject {bad:?}");
    }
}

#[test]
fn capability_allows_only_the_given_origin_and_is_valid_json_shape() {
    let json = capability_json("https://my-backend.onrender.com");
    assert!(json.contains(r#""url": "https://my-backend.onrender.com/*""#));
    assert!(json.contains(r#""identifier": "http:default""#));
    assert!(json.contains(r#""identifier": "backend-url""#));
    assert!(!json.contains("localhost"));
    // Balanced braces/brackets, a cheap check that the template is well formed
    assert_eq!(json.matches('{').count(), json.matches('}').count());
    assert_eq!(json.matches('[').count(), json.matches(']').count());
}

#[test]
fn dotenv_parsing_handles_quotes_comments_and_last_assignment() {
    let file = "# comment\nOTHER=1\nVITE_BACKEND_URL=http://old\nexport VITE_BACKEND_URL=\"https://new.example.com\"\n";
    assert_eq!(
        dotenv_value(file, "VITE_BACKEND_URL").as_deref(),
        Some("https://new.example.com")
    );
    assert_eq!(
        dotenv_value("VITE_BACKEND_URL=\n", "VITE_BACKEND_URL"),
        None
    );
    assert_eq!(
        dotenv_value("# VITE_BACKEND_URL=x\n", "VITE_BACKEND_URL"),
        None
    );
    assert_eq!(dotenv_value("OTHER=1\n", "VITE_BACKEND_URL"), None);
}

#[test]
fn resolution_prefers_environment_then_env_local_then_env_then_default() {
    let local = "VITE_BACKEND_URL=https://from-local.example.com".to_string();
    let dotenv = "VITE_BACKEND_URL=https://from-dotenv.example.com".to_string();
    let files = [local, dotenv.clone()];

    assert_eq!(
        resolve_backend_url(Some("https://from-env.example.com".into()), &files),
        "https://from-env.example.com"
    );
    assert_eq!(
        resolve_backend_url(None, &files),
        "https://from-local.example.com"
    );
    assert_eq!(
        resolve_backend_url(Some("  ".into()), &[dotenv]),
        "https://from-dotenv.example.com"
    );
    assert_eq!(resolve_backend_url(None, &[]), DEFAULT_BACKEND_URL);
}
