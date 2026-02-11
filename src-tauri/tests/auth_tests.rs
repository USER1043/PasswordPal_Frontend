use passwordpal_lib::commands::auth::{register_vault_logic, login_vault_logic, change_password_optimization_logic};
#[test]
fn test_register_flow() {
    let password = "secure_password".to_string();
    
    // Test registration
    let result = register_vault_logic(password.clone());
    assert!(result.is_ok());
    
    let (response, mek) = result.unwrap();
    
    assert!(!response.salt.is_empty());
    assert!(!response.wrapped_mek.is_empty());
    assert!(!response.auth_hash.is_empty());
    assert_eq!(mek.len(), 32);
}

#[test]
fn test_login_flow() {
    let password = "secure_password".to_string();
    
    // 1. Register first to get credentials
    let (reg_response, original_mek) = register_vault_logic(password.clone()).expect("Registration failed");
    
    // 2. Login with correct credentials
    let login_result = login_vault_logic(
        password.clone(),
        reg_response.salt.clone(),
        reg_response.wrapped_mek.clone()
    );
    
    assert!(login_result.is_ok());
    let (login_response, login_mek) = login_result.unwrap();
    
    // Auth hash should match
    assert_eq!(login_response.auth_hash, reg_response.auth_hash);
    
    // MEK should match
    assert_eq!(login_mek, original_mek);
}

#[test]
fn test_login_invalid_password() {
    let password = "secure_password".to_string();
    
    // 1. Register
    let (reg_response, _) = register_vault_logic(password.clone()).expect("Registration failed");
    
    // 2. Try login with wrong password
    let login_result = login_vault_logic(
        "wrong_password".to_string(),
        reg_response.salt,
        reg_response.wrapped_mek
    );
    
    assert!(login_result.is_err());
}


#[test]
fn test_change_password_flow() {
    let old_password = "old_password".to_string();
    let new_password = "new_password".to_string();
    
    // 1. Register with old password
    let (reg_response, original_mek) = register_vault_logic(old_password.clone()).expect("Registration failed");
    
    // 2. Change password
    let change_result = change_password_optimization_logic(
        reg_response.wrapped_mek.clone(),
        old_password.clone(),
        new_password.clone(),
        reg_response.salt.clone()
    );
    
    assert!(change_result.is_ok());
    let new_wrapped_mek = change_result.unwrap();
    
    // 3. Try to login with OLD password (should fail)
    let login_old = login_vault_logic(
        old_password.clone(),
        reg_response.salt.clone(),
        new_wrapped_mek.clone()
    );
    assert!(login_old.is_err());
    
    // 4. Try to login with NEW password (should succeed)
    let login_new = login_vault_logic(
        new_password.clone(),
        reg_response.salt.clone(),
        new_wrapped_mek.clone()
    );
    
    assert!(login_new.is_ok());
    let (_, new_mek) = login_new.unwrap();
    
    // MEK should be preserved (it was just re-wrapped)
    assert_eq!(new_mek, original_mek);
}
