# Contributing to OllamaGUI Professional

Thank you for your interest in contributing to OllamaGUI! This document provides guidelines and information for contributors.

## 🎯 Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code:

- **Be respectful** and inclusive of all contributors
- **Be constructive** in feedback and discussions
- **Be collaborative** and help others learn
- **Be patient** with questions and different experience levels

## 🚀 Getting Started

### Prerequisites
- Node.js 16.0.0 or higher
- Git for version control
- Basic knowledge of JavaScript, HTML, CSS
- Familiarity with Node.js and web development

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/OllamaGUI.git
   cd OllamaGUI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   # or
   node app/backend/server.js
   ```

4. **Verify setup**
   - Open http://localhost:3003
   - Run test suite: `npm test`

## 📋 How to Contribute

### 🐛 Bug Reports

When filing a bug report, please include:

1. **Clear title** describing the issue
2. **Steps to reproduce** the bug
3. **Expected behavior** vs actual behavior
4. **Environment details**:
   - OS and version
   - Node.js version
   - Browser and version (if applicable)
   - Ollama version
5. **Console logs** or error messages
6. **Screenshots** if UI-related

**Template:**
```markdown
**Bug Description**
A clear and concise description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- OS: [e.g., Windows 11]
- Node.js: [e.g., 18.16.0]
- Browser: [e.g., Chrome 114.0.5735.199]
- Ollama: [e.g., 0.1.32]
```

### 💡 Feature Requests

For feature requests, please include:

1. **Clear description** of the feature
2. **Use case**: Why is this feature needed?
3. **Proposed solution**: How should it work?
4. **Alternatives considered**: Other solutions you've thought about
5. **Implementation notes**: Technical considerations (optional)

### 🔧 Code Contributions

#### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Follow the Analysis-First methodology**
   - Document your approach in `docs/analysis/`
   - Plan the implementation before coding
   - Consider impact on existing functionality

3. **Implement your changes**
   - Follow the modular architecture patterns
   - Write tests for new functionality
   - Update documentation as needed

4. **Test thoroughly**
   ```bash
   npm test
   npm run lint  # if available
   ```

5. **Commit with clear messages**
   ```bash
   git add .
   git commit -m "feat: add system prompt export functionality

   - Add export button to system prompt editor
   - Support JSON and text format export
   - Include validation for export data
   
   Closes #123"
   ```

6. **Push and create pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

#### Commit Message Guidelines

We follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

**Examples:**
```bash
feat(chat): add message search functionality
fix(security): resolve XSS vulnerability in message display
docs(readme): update installation instructions
refactor(api): extract common validation logic
```

## 🏗️ Architecture Guidelines

### Modular Architecture Principles

OllamaGUI follows a strict modular architecture. Please adhere to these principles:

#### Backend Modules
- **Controllers**: Handle HTTP requests and responses
- **Core Services**: Business logic and data processing
- **Security**: Input validation and security checks
- **Config**: Environment and configuration management

#### Frontend Modules
- **Components**: Reusable UI components (< 200 lines each)
- **Managers**: Business logic coordination
- **Services**: API communication and data services
- **Utils**: Pure utility functions

### File Size Guidelines
- **JavaScript files**: < 500 lines (strict requirement)
- **CSS modules**: < 200 lines each
- **HTML files**: < 300 lines
- **Configuration files**: < 100 lines

### Naming Conventions
- **Files**: PascalCase for classes, camelCase for utilities
- **Functions**: camelCase with descriptive names
- **Classes**: PascalCase with clear responsibility
- **Constants**: UPPER_SNAKE_CASE

## 🧪 Testing Guidelines

### Test Requirements
- All new features must include tests
- Bug fixes should include regression tests
- Aim for >90% test coverage on new code

### Test Categories
1. **Unit Tests**: Individual function/method testing
2. **Integration Tests**: Component interaction testing
3. **End-to-End Tests**: Full user workflow testing
4. **Performance Tests**: Response time and memory usage

### Running Tests
```bash
# Full test suite
npm test

# Specific test file
npm test -- --grep "Chat functionality"

# Performance tests
npm run test:performance
```

## 📚 Documentation

### Documentation Requirements
- All new features need documentation updates
- API changes require README updates
- Complex features need separate documentation files
- Code comments for complex logic

### Documentation Types
1. **README.md**: Main project documentation
2. **CONTRIBUTING.md**: This file
3. **API Documentation**: In-code JSDoc comments
4. **Architecture Docs**: In `docs/analysis/` folder
5. **User Guides**: In `docs/guides/` folder

## 🔍 Code Review Process

### Pull Request Guidelines

1. **Clear title and description**
   - What does this PR do?
   - Why is this change needed?
   - How was it tested?

2. **Small, focused changes**
   - One feature or fix per PR
   - Avoid mixing refactoring with new features
   - Keep PRs under 400 lines when possible

3. **Self-review checklist**
   - [ ] Code follows architecture guidelines
   - [ ] Tests pass locally
   - [ ] Documentation updated
   - [ ] No console.log or debugging code
   - [ ] No security vulnerabilities
   - [ ] Performance impact considered

### Review Process
1. **Automated checks** run on all PRs
2. **Maintainer review** for code quality and architecture
3. **Community review** welcome for all PRs
4. **Testing** on multiple environments
5. **Merge** after approval and passing checks

## 🛡️ Security

### Security Guidelines
- Never commit API keys or secrets
- Validate all user inputs
- Sanitize data before storage
- Follow OWASP security guidelines
- Report security issues privately

### Reporting Security Issues
If you discover a security vulnerability:

1. **Do NOT** create a public GitHub issue
2. **Email** security concerns to [SECURITY_EMAIL]
3. **Include** detailed reproduction steps
4. **Wait** for acknowledgment before public disclosure

## 📈 Performance

### Performance Guidelines
- Optimize for < 50ms API response time
- Minimize bundle size and loading time
- Use efficient algorithms and data structures
- Monitor memory usage and prevent leaks
- Test performance on different hardware

### Performance Testing
```bash
# API performance
npm run test:api-performance

# Frontend performance
npm run test:frontend-performance

# Memory usage
npm run test:memory
```

## 🎉 Recognition

Contributors are recognized in:
- GitHub contributor graph
- README acknowledgments section
- Release notes for significant contributions
- Special recognition for outstanding contributions

## 📞 Getting Help

### Community Support
- **GitHub Discussions**: For questions and ideas
- **GitHub Issues**: For bugs and feature requests
- **Code Review**: Ask questions in PR comments

### Development Help
- **Architecture questions**: Tag maintainers in discussions
- **Implementation help**: Create draft PRs for early feedback
- **Testing assistance**: Ask in issues or discussions

## 🚀 Release Process

### Version Numbering
We follow [Semantic Versioning](https://semver.org/):
- **Major** (1.0.0): Breaking changes
- **Minor** (1.1.0): New features, backwards compatible
- **Patch** (1.1.1): Bug fixes, backwards compatible

### Release Schedule
- **Major releases**: Quarterly
- **Minor releases**: Monthly
- **Patch releases**: As needed for critical fixes

## 📋 Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature request
- `documentation`: Documentation improvements
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention needed
- `performance`: Performance improvements
- `security`: Security-related issues

---

Thank you for contributing to OllamaGUI! Your efforts help make local AI more accessible to everyone. 🚀