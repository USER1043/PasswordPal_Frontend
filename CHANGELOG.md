# Changelog

## [0.2.0](https://github.com/USER1043/PasswordPal_Frontend/compare/passwordpal-v0.1.45...passwordpal-v0.2.0) (2026-05-13)


### Features

* add automated release pipeline and update the current app versi… ([2c491a4](https://github.com/USER1043/PasswordPal_Frontend/commit/2c491a40d6708231bd9e5702123605c2de5243b0))
* add automated release pipeline and update the current app version number. ([591796f](https://github.com/USER1043/PasswordPal_Frontend/commit/591796f311c8b0cfede444fce78c4d8254fe965a))
* Add fallback backend url ([7b78428](https://github.com/USER1043/PasswordPal_Frontend/commit/7b784286c36370308711aeeaabc2d4fc48422145))
* Add logo for the app ([44b5635](https://github.com/USER1043/PasswordPal_Frontend/commit/44b5635b3fe38717a0e4261afa5659a98db1cd0e))
* Add OS-specific User-Agent to requests, improve login error han… ([56e6f16](https://github.com/USER1043/PasswordPal_Frontend/commit/56e6f163cbd09d7b9915eea47907688eaa9404dc))
* Add OS-specific User-Agent to requests, improve login error handling with audit logging for local decryption, and enhance breach check feedback. ([0732dc7](https://github.com/USER1043/PasswordPal_Frontend/commit/0732dc7b1c0e3d5401c6b0d3fba8c3d04d87d118))
* Add React hook to detect whether the app is online or went offline using OS-level signals ([b0b41b4](https://github.com/USER1043/PasswordPal_Frontend/commit/b0b41b4200d6cecd9b531dd03ff219e33ef7afee))
* Add recovery key mechanism to change master password ([50f5b86](https://github.com/USER1043/PasswordPal_Frontend/commit/50f5b864d6cbfec73071522e420a1794682c7a78))
* add sample env file ([994bc94](https://github.com/USER1043/PasswordPal_Frontend/commit/994bc94c84a53ed648a5dfda3188337009c0ef76))
* Add semantic commit based release instead of release for all push ([7d80e7f](https://github.com/USER1043/PasswordPal_Frontend/commit/7d80e7f11a099789df81bf010b87f8302ba35f8c))
* Add semantic commit based release instead of release for all push ([e26c6f1](https://github.com/USER1043/PasswordPal_Frontend/commit/e26c6f1b7339220ed872f3d2c8d4b13dd2fc38ed))
* add SQLite database service for local-first data caching ([daf5694](https://github.com/USER1043/PasswordPal_Frontend/commit/daf56942fc66576b3e6d0c3faefb02efb9195cea))
* Allow Tauri app to access localhost:3000 and add query parameter support to the API client. ([0c49f0a](https://github.com/USER1043/PasswordPal_Frontend/commit/0c49f0a86c116934aea4df0bc0074c74403cad93))
* **auth:** implement centralized sensitive state clearing for React components ([7237551](https://github.com/USER1043/PasswordPal_Frontend/commit/7237551b05c7c9ed9a39700a04c794fbde4d119a))
* **auth:** implement client-side offline token storage and retrieval ([26cc356](https://github.com/USER1043/PasswordPal_Frontend/commit/26cc356ecfc3a901f91d016c2808e57b567ac4a4))
* enable offline authentication caching with SQLite ([b8c0bf3](https://github.com/USER1043/PasswordPal_Frontend/commit/b8c0bf31f29587ce2c54995562d72899731429e8))
* Enhance password search to filter by URL and fix version passing when updating vault entries. ([a131cdd](https://github.com/USER1043/PasswordPal_Frontend/commit/a131cddddd3156debda605376a00255a08967910))
* Enhanced the user authentication workflow using kdf instead of simple hashing ([4901a0f](https://github.com/USER1043/PasswordPal_Frontend/commit/4901a0fbf24e8639b7e30906298268b0c25cf4b8))
* getting favicon from backend as proxy server ([132f223](https://github.com/USER1043/PasswordPal_Frontend/commit/132f223f201b468911c3f48c99778fe774298825))
* getting favicon from backend as proxy server ([47956b0](https://github.com/USER1043/PasswordPal_Frontend/commit/47956b01a15231f6b86bd4416653c453cf6d3568))
* Hash recovery key with SHA-256 before registration and add `ApiResponse` type for API calls. ([ceac164](https://github.com/USER1043/PasswordPal_Frontend/commit/ceac1647b6036906b42555546552d164b5941585))
* Implement automatic offline vault synchronization when connectivity is restored. ([32f33e7](https://github.com/USER1043/PasswordPal_Frontend/commit/32f33e7b7236ad81fed796d7ba118b358c52781e))
* implement local-first syncing and offline CRUD for the vault ([ea68419](https://github.com/USER1043/PasswordPal_Frontend/commit/ea68419f4d14a92f2afc2482a914c76dcb2504bd))
* Implement manual vault item sync conflict resolution with dedicated UI and context. ([9129b49](https://github.com/USER1043/PasswordPal_Frontend/commit/9129b49ce109b9bd7e359fa2661392a327e411ab))
* implement scorched earth logout and fresh device fingerprinting for account isolation ([cf637b7](https://github.com/USER1043/PasswordPal_Frontend/commit/cf637b79500f1d162e606eb4387874c39df8dd16))
* install Tauri SQL Plugin and dependencies ([e35040a](https://github.com/USER1043/PasswordPal_Frontend/commit/e35040af3e9984227b88980d07b291d4e4f8a221))
* Migrate HTTP client from Axios to Tauri's native HTTP plugin and update associated configurations and dependencies. ([5e69397](https://github.com/USER1043/PasswordPal_Frontend/commit/5e69397fbbc5fcfcd7300afcaff5adf41797d540))
* **models:** update vault models for rust bridge ([cb9259b](https://github.com/USER1043/PasswordPal_Frontend/commit/cb9259bbf2ee14ad0fbffd994034c8cfac3a1231))
* **network:** Replace web APIs with native Tauri background polling and 503 fallback ([c43ae30](https://github.com/USER1043/PasswordPal_Frontend/commit/c43ae305e8fbfcf24edc1d2a82b254f3e8ad8ba3))
* **sync:** implement remote-to-local sqlite hydration with raw ciphertext passing ([3f989ba](https://github.com/USER1043/PasswordPal_Frontend/commit/3f989bab84e6ba7053ab1d973ee021feeb494181))
* **tauri:** add offline auth caching Rust commands ([7c296b6](https://github.com/USER1043/PasswordPal_Frontend/commit/7c296b60f624f0196c5f72683829f77621cefd71))
* **tauri:** zeroize sensitive credentials in memory ([8023e69](https://github.com/USER1043/PasswordPal_Frontend/commit/8023e698cca93960ae7d024f2f398292fa91f691))
* **ui:** display offline fallback screens for network-dependent pages ([90ebab2](https://github.com/USER1043/PasswordPal_Frontend/commit/90ebab2b890200a3b436cc4de9464cf2f0a65558))
* **ui:** implement sensitive state scrubbing on unmount and logout ([4c9cbb2](https://github.com/USER1043/PasswordPal_Frontend/commit/4c9cbb2de677a571f0b66da2401de7061787e4da))
* **ui:** introduce AppLogo component and integrate into layout ([b54adb2](https://github.com/USER1043/PasswordPal_Frontend/commit/b54adb257929e6f858b5d4e9e55b84a0efb450ee))


### Bug Fixes

* all eslint errors, including typing any catches to unknown, silencing unused _ variables, fixing missing React hook dependencies, and rectifying type assertions. ([a26e36c](https://github.com/USER1043/PasswordPal_Frontend/commit/a26e36c8849e63029b6d1c4b207a5361f3f0e046))
* **api:** allow cross-origin cookies in tauri fetch adapter ([606f6e7](https://github.com/USER1043/PasswordPal_Frontend/commit/606f6e77b68ea59a7b941d5b562873d0be88be01))
* backup code size mismatch in the input ([b64a5a2](https://github.com/USER1043/PasswordPal_Frontend/commit/b64a5a2853f3a3f77f3c23c9c8dafbcca3b6d200))
* changing master password controller to contact the correct api endpoint ([49164ac](https://github.com/USER1043/PasswordPal_Frontend/commit/49164ac31e42687ec59adc1321ebf65fb8bee5e4))
* CI/CD pipeline bug fixes ([33d14b1](https://github.com/USER1043/PasswordPal_Frontend/commit/33d14b1d921a860c44198321443320f17e63ae96))
* export plaintext passwords instead of encrypted ones ([61d8ccb](https://github.com/USER1043/PasswordPal_Frontend/commit/61d8ccb692885ffbc46042c047dc1a10293aea5b))
* **export:** resolve nested record values for CSV vault export ([6a64164](https://github.com/USER1043/PasswordPal_Frontend/commit/6a64164c2809751de8cab6abae92bfc90583ed6e))
* fixed the eslint version incompatibility by using latest version ([e673e6f](https://github.com/USER1043/PasswordPal_Frontend/commit/e673e6f92c96b7199cc5158c8bb051cde843cf32))
* folder css bug in the add/update password form and ([5db0166](https://github.com/USER1043/PasswordPal_Frontend/commit/5db01661a1c4919323fb67f796fd33ae877a11cb))
* **identity:** Implement persistent SQLite device tracking to prevent identity drift ([e7fb251](https://github.com/USER1043/PasswordPal_Frontend/commit/e7fb251aa4671bb9272d7feac726aab0e43a7120))
* making the test async to align with async handleSubmit() ([63c57eb](https://github.com/USER1043/PasswordPal_Frontend/commit/63c57eb3759837f988ff43056afabf011f709c6c))
* Regex matching bug for optional scope and formatted the rust code ([d70d0ce](https://github.com/USER1043/PasswordPal_Frontend/commit/d70d0ce038f39015ce54e6ea158cadac264dcd26))
* Regex matching bug for optional scope and formatted the rust code ([747188a](https://github.com/USER1043/PasswordPal_Frontend/commit/747188ae24a3caab245062a422047e2d36ec1b1d))
* removed --ext flag which is no longer supported ([6960330](https://github.com/USER1043/PasswordPal_Frontend/commit/69603306b63d134ec4f70beb7d68f6fd22293e7d))
* resolved the errors generated by cargo clippy due to unnecessary borrow and proper fields assignment of VaultState objects ([699e4cd](https://github.com/USER1043/PasswordPal_Frontend/commit/699e4cdfe61f1a1075873eee0d3ae83e93592e82))
* small line wrapping differences ([43b50a8](https://github.com/USER1043/PasswordPal_Frontend/commit/43b50a82fdf25f9e11bb7c9f388f12bf0177815a))
* **ui:** gracefully handle undefined vault entries with optional chaining ([b94a3c0](https://github.com/USER1043/PasswordPal_Frontend/commit/b94a3c045aece6a5642b392fe6601ea1be9944bb))
* **ui:** Implement event-driven sync architecture to eliminate cloud sync status flicker ([8d4c7fa](https://github.com/USER1043/PasswordPal_Frontend/commit/8d4c7fa2b4cb8cf77f83f4d2057ba5c3ae9890a5))
* **ui:** navigate to vault view when clicking new item from sidebar ([b4fb789](https://github.com/USER1043/PasswordPal_Frontend/commit/b4fb78942b86435ad67dc998c7a0cb4e51a6f4da))
* **ui:** update AppLogo to use png instead of jpg ([7f2f905](https://github.com/USER1043/PasswordPal_Frontend/commit/7f2f9053f0c8eac5b4c70fa8ab33199566c512a2))
* Updated the npm package because of vulnerability ([33b752a](https://github.com/USER1043/PasswordPal_Frontend/commit/33b752ae315527e9b52fd484a42cd15372f1cb05))
* Updated the npm package because of vulnerability ([5d9bb34](https://github.com/USER1043/PasswordPal_Frontend/commit/5d9bb347ea46a00a71246fc5ce8bb4a7d54f5dc8))


### Performance Improvements

* **sync:** throttle massive concurrent POST floods on batch DB imports ([3396207](https://github.com/USER1043/PasswordPal_Frontend/commit/33962077b0dab55d9a3e30461856d2b81198e183))
