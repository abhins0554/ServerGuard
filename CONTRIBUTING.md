# Contributing to ServerGuard

Thank you for your interest in contributing to ServerGuard! This document provides guidelines and information for contributors.

## 🚀 Quick Start

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create** a feature branch
4. **Make** your changes
5. **Test** your changes
6. **Submit** a pull request

## 📋 Development Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/yourusername/ServerGuard.git
cd ServerGuard

# Run the automated setup
python start.py
```

This will automatically:
- Create a Python virtual environment
- Install Python dependencies
- Install Node.js dependencies
- Start both backend and frontend servers

## 🛠️ Project Structure

```
ServerGuard/
├── backend/              # FastAPI backend
│   ├── main.py          # Main application
│   └── requirements.txt  # Python dependencies
├── frontend/            # React frontend
│   ├── src/            # React components
│   ├── public/         # Static files
│   └── package.json    # Node.js dependencies
├── assets/             # Screenshots and images
├── start.py            # Automated setup script
└── README.md           # Project documentation
```

## 🔧 Development Workflow

### Backend Development

The backend is built with FastAPI and provides:
- System monitoring APIs
- File management endpoints
- WebSocket connections for real-time data
- Terminal access

**Key files:**
- `backend/main.py` - Main FastAPI application
- `backend/requirements.txt` - Python dependencies

### Frontend Development

The frontend is built with React and provides:
- Real-time dashboard
- System monitoring interface
- File management UI
- Terminal interface

**Key files:**
- `frontend/src/` - React components
- `frontend/package.json` - Node.js dependencies

## 📝 Code Style

### Python (Backend)
- Follow PEP 8 style guide
- Use type hints
- Add docstrings to functions
- Keep functions small and focused

### JavaScript/React (Frontend)
- Use functional components with hooks
- Follow ESLint configuration
- Use meaningful variable names
- Add comments for complex logic

## 🧪 Testing

### Backend Testing
```bash
# Run backend tests (when implemented)
cd backend
python -m pytest
```

### Frontend Testing
```bash
# Run frontend tests
cd frontend
npm test
```

## 📦 Building for Production

### Backend
```bash
# Install production dependencies
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.main:app
```

### Frontend
```bash
# Build for production
cd frontend
npm run build
```

## 🐛 Bug Reports

When reporting bugs, please include:
- **Description** of the issue
- **Steps** to reproduce
- **Expected** behavior
- **Actual** behavior
- **Environment** details (OS, Python/Node versions)
- **Screenshots** if applicable

## 💡 Feature Requests

When requesting features, please include:
- **Description** of the feature
- **Use case** and benefits
- **Implementation** suggestions (optional)
- **Mockups** or examples (if applicable)

## 🔄 Pull Request Process

1. **Update** documentation if needed
2. **Add** tests for new features
3. **Ensure** all tests pass
4. **Update** CHANGELOG.md (if applicable)
5. **Submit** pull request with clear description

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Refactoring

## Testing
- [ ] Backend tests pass
- [ ] Frontend tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] All tests pass
```

## 📚 Documentation

- **README.md** - Main project documentation
- **API Documentation** - Available at `/docs` when running backend
- **Code Comments** - Inline documentation in code

## 🤝 Community Guidelines

- Be respectful and inclusive
- Help others learn and grow
- Provide constructive feedback
- Follow the project's code of conduct

## 📞 Getting Help

- **Issues** - Use GitHub issues for bugs and feature requests
- **Discussions** - Use GitHub discussions for questions
- **Documentation** - Check README.md and inline docs first

## 🎯 Areas for Contribution

### High Priority
- [ ] Additional system monitoring metrics
- [ ] Enhanced security features
- [ ] Performance optimizations
- [ ] Mobile-responsive UI improvements

### Medium Priority
- [ ] Docker containerization
- [ ] CI/CD pipeline setup
- [ ] Unit and integration tests
- [ ] Internationalization (i18n)

### Low Priority
- [ ] Additional themes/skins
- [ ] Plugin system
- [ ] Advanced analytics
- [ ] Multi-language support

## 📄 License

By contributing to ServerGuard, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to ServerGuard! 🛡️✨ 