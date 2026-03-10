pub fn get_os_username() -> String {
    std::env::var("USER")
        .unwrap_or_else(|_| std::env::var("USERNAME").unwrap_or_else(|_| "UnknownUser".to_string()))
}
#[tauri::command]
pub fn get_os_info() -> String {
    format!(
        "{}/{} PasswordPal-Desktop",
        std::env::consts::OS,
        get_os_username()
    )
}
