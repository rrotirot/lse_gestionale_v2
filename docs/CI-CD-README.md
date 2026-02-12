# LSE Members Interface - CI/CD Pipeline

This document describes the comprehensive CI/CD pipeline implemented for the LSE Members Interface project.

## 🚀 Pipeline Overview

The CI/CD pipeline consists of multiple GitHub Actions workflows that ensure code quality, security, and automated deployments.

### Workflows

#### 1. Main CI/CD Pipeline (`ci-cd.yml`)
**Triggers**: Push/PR to `main` and `develop` branches, manual dispatch

**Jobs**:
- **Code Quality**: TypeScript checking, linting, formatting validation
- **Security**: Vulnerability scanning with Trivy, npm audit
- **Backend Tests**: Unit tests with MongoDB service, coverage reporting
- **Frontend Tests**: Build verification and basic testing
- **Docker Build**: Multi-platform container builds with caching
- **Deploy**: Automated deployments to staging/production

#### 2. Security Scanning (`security.yml`)
**Triggers**: Push/PR, weekly schedule (Mondays 6 AM UTC)

**Features**:
- CodeQL security analysis for JavaScript/TypeScript
- Automated security vulnerability detection
- SARIF report generation for GitHub Security tab

#### 3. Automated Updates (`automated-updates.yml`)
**Triggers**: Weekly (Mondays 2 AM UTC), manual dispatch

**Features**:
- Automated dependency updates
- Security vulnerability fixes
- Automated PR creation for updates

#### 4. Docker Integration (`docker-build-and-test.yml`)
**Triggers**: Changes to backend code

**Features**:
- Backend container build and push to GHCR
- Integration testing with MongoDB
- Health checks and smoke tests

#### 5. Deployment (`deploy.yml`)
**Triggers**: Manual dispatch with environment selection

**Features**:
- Environment-specific deployments (staging/production)
- Configurable Docker image tags
- Health checks and notifications

## 🛠️ Setup Instructions

### 1. Repository Secrets
Configure these secrets in your GitHub repository:

```bash
# For Docker Registry (GHCR)
GITHUB_TOKEN          # Auto-provided by GitHub

# For Backend (if needed)
JWT_SECRET           # JWT signing secret
API_KEY              # API authentication key

# For AWS Deployment (optional)
AWS_ACCESS_KEY_ID    # AWS access key
AWS_SECRET_ACCESS_KEY # AWS secret key
AWS_REGION           # AWS region
```

### 2. Environment Configuration
Create environments in GitHub repository settings:

- **staging**: For staging deployments
- **production**: For production deployments

### 3. Branch Protection Rules
Configure branch protection for `main`:

```yaml
# Required status checks
- ci/codacy-security-scan
- backend-test
- code-quality
- docker-build
- frontend-test
- security

# Require up-to-date branches
- Required

# Restrict pushes
- Include administrators: false
```

## 📊 Quality Gates

### Code Coverage Requirements
- **Lines**: Minimum 50%
- **Functions**: Minimum 40%
- **Branches**: Minimum 40%

### Code Quality Checks
- TypeScript compilation without errors
- ESLint passing
- Prettier formatting validation
- Security vulnerability scans

## 🔒 Security Features

### Automated Security Scanning
- **Trivy**: Container vulnerability scanning
- **CodeQL**: Static application security testing (SAST)
- **npm audit**: Dependency vulnerability checks
- **Dependabot**: Automated dependency updates

### Security Policies
- Automated PR creation for security updates
- Security scan results uploaded to GitHub Security tab
- Weekly security scans for comprehensive coverage

## 🚢 Deployment Strategy

### Multi-Environment Deployment
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Feature    │ => │   Staging   │ => │ Production │
│   Branch    │    │   (Auto)    │    │  (Manual)  │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Docker Strategy
- **Multi-platform builds**: linux/amd64, linux/arm64
- **Layer caching**: GitHub Actions cache for faster builds
- **Registry**: GitHub Container Registry (GHCR)
- **Tagging**: Semantic versioning + SHA-based tags

## 📈 Monitoring & Reporting

### Test Results
- JUnit test reports
- Code coverage reports (Codecov integration)
- Test artifacts and logs

### Quality Metrics
- Code coverage trends
- Security vulnerability tracking
- Performance benchmarks

### Notifications
- Slack/Discord integration for deployment status
- Email notifications for critical failures
- Automated PR comments for quality issues

## 🔄 Automated Processes

### Dependency Management
- **Weekly updates**: Automated dependency updates
- **Security fixes**: Automatic security patch application
- **PR automation**: Auto-generated pull requests for updates

### Code Quality
- **Linting**: Automated code style enforcement
- **Formatting**: Consistent code formatting
- **Type checking**: Compile-time type safety

## 🚨 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check build logs
gh run list --workflow=ci-cd.yml
gh run view <run-id> --log
```

#### Docker Issues
```bash
# Check Docker build logs
docker build --progress=plain .
```

#### Test Failures
```bash
# Run tests locally
cd backend && npm test
npm run build
```

### Debugging Steps
1. Check GitHub Actions logs
2. Verify environment secrets
3. Test locally with same Node.js version
4. Check Docker container logs
5. Verify MongoDB connectivity

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Build/Push Action](https://github.com/docker/build-push-action)
- [Codecov Documentation](https://docs.codecov.com/)
- [Trivy Security Scanner](https://aquasecurity.github.io/trivy/)
- [CodeQL Documentation](https://codeql.github.com/)

## 🤝 Contributing

When contributing to this project:

1. **Always create feature branches** from `develop`
2. **Write tests** for new functionality
3. **Update documentation** as needed
4. **Follow the established patterns** for CI/CD

### Pull Request Process
1. PR triggers CI pipeline
2. All quality gates must pass
3. Code review required
4. Squash merge to maintain clean history

---

**Last Updated**: December 2025
**Pipeline Version**: 1.0.0