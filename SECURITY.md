# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | ✅ Active support  |
| 0.x.x   | ❌ End of life     |

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to **security@example.com**. You should receive a response within 48 hours. If for some reason you do not, please follow up to ensure we received your original message.

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fix (if available)

### Our process

1. **Acknowledgment** — We confirm receipt within 48 hours
2. **Assessment** — We evaluate severity using CVSS v3.1 scoring
3. **Fix** — We develop and test a fix
4. **Disclosure** — We coordinate disclosure with the reporter
5. **Release** — We publish a security advisory and patch release

We aim to resolve critical vulnerabilities within 7 days and high-severity issues within 30 days.

## Security Architecture

### Authentication & Authorization

- **JWT-based authentication** with short-lived access tokens (1 hour)
- **Refresh token rotation** to prevent token reuse attacks
- **Role-based access control (RBAC)**: `admin` and `viewer` roles
- **Password hashing** using bcrypt with configurable salt rounds (default: 10)
- **Session invalidation** on password change

### Network Security

- **TLS 1.2+ enforced** for all external connections
- **HSTS headers** with 1-year max-age and includeSubDomains
- **Rate limiting**: 30 req/s general API, 5 req/min for login endpoints
- **WebSocket authentication** via token in first message
- **CORS** restricted to configured origins

### Data Protection

- **SQLite database** with file-level encryption at rest (when configured)
- **Sensitive data** (tokens, passwords, API keys) never logged
- **Backup encryption** using AES-256 before S3 upload
- **Automatic data retention** cleanup for metrics older than configured threshold

### Input Validation

- All API inputs validated with Zod schemas
- SQL injection prevention via parameterized queries
- XSS prevention via output encoding and CSP headers
- File upload size limits (10 MB default)

### Container Security

- **Non-root container** execution (UID 1000)
- **Read-only root filesystem** where possible
- **Resource limits** enforced (CPU/memory)
- **Security scanning** of container images in CI/CD
- **No unnecessary packages** in production images (Alpine-based)

### Kubernetes Security

- **Network policies** restrict pod-to-pod communication
- **Pod Security Standards** enforced (restricted profile)
- **Secrets management** via K8s Secrets (consider external secret managers for production)
- **Service mesh** compatible (Istio/Linkerd)

## Best Practices for Operators

### Deployment

1. **Change default credentials** before first deployment
2. **Use external secret management** (Vault, AWS Secrets Manager) in production
3. **Enable database encryption** at rest
4. **Configure proper CORS** origins — never use `*` in production
5. **Set up monitoring** and alerting for security events

### Configuration

```bash
# Required security environment variables
JWT_SECRET=<random-64-char-string>    # Generate with: openssl rand -hex 32
DB_ENCRYPTION_KEY=<random-key>        # Enable SQLite encryption
REDIS_PASSWORD=<strong-password>      # Redis authentication
ALLOWED_ORIGINS=https://dash.example.com  # CORS restriction
```

### Monitoring

- Monitor failed login attempts (alert after 5 failures in 5 minutes)
- Monitor unusual API usage patterns
- Monitor resource consumption for anomalies
- Set up audit logging for admin actions

### Incident Response

1. **Rotate all secrets** immediately upon suspected breach
2. **Review audit logs** for unauthorized access
3. **Notify affected users** if data exposure occurred
4. **Document the incident** for post-mortem analysis

## Security Checklist

- [ ] Default passwords changed
- [ ] TLS configured with valid certificates
- [ ] Rate limiting enabled
- [ ] CORS origins restricted
- [ ] Database encryption enabled
- [ ] Backup encryption configured
- [ ] Security headers present
- [ ] Container runs as non-root
- [ ] Resource limits set
- [ ] Monitoring and alerting active
- [ ] Incident response plan documented

## Contact

- Security issues: security@example.com
- General inquiries: support@example.com

## Changelog

| Date       | Change                                      |
| ---------- | ------------------------------------------- |
| 2025-01-01 | Initial security policy                     |
