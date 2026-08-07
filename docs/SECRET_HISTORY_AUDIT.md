# Secret-history audit

Audit date: 2026-08-06

The complete reachable Git history was scanned by filename and content signature without printing candidate values. No key/certificate/service-account files and no AWS access keys, Google API keys, PEM private keys, Paystack live keys, or JWT secret assignments were found.

Three historical README revisions (`0556773`, `7b85071`, and `babc8af`) contain the same credential-shaped setup examples: a short Paystack test-key placeholder and a localhost/example database URL. Their shape and repetition identify them as documentation placeholders, not usable production credentials. They remain a reason to avoid realistic credential syntax in future documentation.

If either example was ever replaced with a usable credential outside the scanned refs, treat it as exposed: revoke it at Paystack or the database provider, rotate the deployment secret, reconcile Paystack events/orders from the exposure window, inspect provider audit logs, and rewrite affected Git history only after coordinating all clones and open branches. History rewriting is not a substitute for revocation.

The root `.gitignore` now excludes `.env`, all `.env.*` files except `.env.example`, service-account JSON, Android/iOS signing material, private keys, logs, and build artifacts. CI should add secret scanning and push protection before merge.
