## How to run tests locally

### Prereqs
- Node.js 20 (or the version used in CI)

### Install dependencies
```bash
# For reproducible CI-like installs (recommended)
npm ci

# Or for development installs
npm install
```

### Run all tests
```bash
# Run root-level tests
npm test

# Run accounting-api tests
(cd accounting/accounting-api && npm test)

# Run accounting-app tests (if test script exists)
(cd accounting/accounting-app && npm run --if-present test)
```
