---
sessionId: session-260421-183414-1o4z
isActive: false
---

# Requirements

### Overview & Goals
The objective is to identify and resolve security vulnerabilities and errors in the EduSpark application.

### Security Scan Results
1.  **High/Medium Risk:** Potential code injection in the Math API route (`app/api/mcp/math/route.ts`) using `mathjs.evaluate()`.
2.  **Low Risk:** Insecure dependency risks (none found, `npm audit` clean).
3.  **Low Risk:** Potential font-loading build errors if external network calls are made during the build process.

### Functional Requirements
- Secure math evaluation by restricting the `mathjs` parser to basic mathematical functions.
- Comprehensive sanitization for all content displayed in the browser.
- Robust build process that does not rely on external font services.

# Technical Design

### Proposed Changes

#### 1. Secure Math Evaluation (`app/api/mcp/math/route.ts`)
- Replace the direct `evaluate(expression)` call with a restricted `evaluate` instance that only allows basic arithmetic and mathematical functions, explicitly forbidding access to sensitive JavaScript functions or modules.

#### 2. Sanitization Audit
- Re-examine all components using `dangerouslySetInnerHTML`. The currently implemented `sanitizeHTML` should be applied uniformly.

#### 3. Build Robustness
- Ensure all fonts are loaded locally via CSS variables (already partially implemented) to avoid build-time network requests.

# Delivery Steps

### ✓ Step 1: Secure Math Evaluation
Refactor `app/api/mcp/math/route.ts` to use a restricted `mathjs` parser, preventing access to sensitive built-in functions.
- Create a safe math evaluation helper.
- Update the API route to use this helper.
- Verify that standard math expressions still work.

### ✓ Step 2: Sanitization Audit
Conduct a final scan of all `dangerouslySetInnerHTML` sinks.
- Ensure all instances are properly sanitized using `sanitizeHTML` or `sanitizeSVG`.
- Verify no `evaluate` or `eval` calls exist outside the restricted math scope.

### ✓ Step 3: Production Build Verification
Verify production build robustness.
- Ensure `next build` completes without external network dependencies (fonts, external assets).
- Add a basic check to CI workflow (if defined) or run locally to confirm.