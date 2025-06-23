# Contributing to PilotForce

Thank you for your interest in contributing to PilotForce! This guide provides information on how to contribute to the project effectively.

## 🤝 How to Contribute

### Types of Contributions

We welcome various types of contributions:

- **Bug Reports**: Report issues you encounter
- **Feature Requests**: Suggest new features or improvements
- **Code Contributions**: Submit pull requests with code changes
- **Documentation**: Improve or add documentation
- **Testing**: Help with testing and quality assurance
- **Design**: Provide UI/UX improvements

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Git
- AWS Account (for testing)
- Code editor (VS Code recommended)

### Development Setup

1. **Fork the Repository**:
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/your-username/pilotforce-app.git
   cd pilotforce-app
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set Up Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start Development Server**:
   ```bash
   npm start
   ```

5. **Run Tests**:
   ```bash
   npm test
   ```

## 📋 Development Workflow

### Branch Strategy

We use a feature branch workflow:

```bash
# Create a new feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description

# Or for documentation
git checkout -b docs/documentation-update
```

### Commit Guidelines

Follow conventional commit format:

```bash
# Format: type(scope): description

# Examples:
git commit -m "feat(auth): add multi-factor authentication"
git commit -m "fix(api): resolve user login issue"
git commit -m "docs(readme): update installation instructions"
git commit -m "test(components): add unit tests for Dashboard"
git commit -m "refactor(utils): improve error handling"
```

#### Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Pull Request Process

1. **Create Pull Request**:
   - Fork the repository
   - Create a feature branch
   - Make your changes
   - Write/update tests
   - Update documentation

2. **Pull Request Template**:
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Documentation update
   - [ ] Refactoring
   - [ ] Test update

   ## Testing
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual testing completed

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] No console errors
   ```

3. **Code Review**:
   - Address review comments
   - Update code as needed
   - Ensure all tests pass

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- --testPathPattern=Dashboard.test.tsx
```

### Writing Tests

Follow these guidelines for writing tests:

```typescript
// Example test structure
import { render, screen, fireEvent } from '@testing-library/react';
import { Dashboard } from '../Dashboard';

describe('Dashboard Component', () => {
  beforeEach(() => {
    // Setup test data
  });

  it('should render dashboard title', () => {
    render(<Dashboard />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    render(<Dashboard />);
    const button = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(button);
    expect(await screen.findByText('Success')).toBeInTheDocument();
  });

  it('should handle errors gracefully', () => {
    // Test error scenarios
  });
});
```

### Test Coverage

Maintain high test coverage:
- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Critical user flows
- **E2E Tests**: Key user journeys

## 📝 Code Style

### TypeScript Guidelines

```typescript
// Use TypeScript strict mode
// Prefer interfaces over types for object shapes
interface User {
  id: string;
  email: string;
  role: UserRole;
}

// Use enums for constants
enum UserRole {
  ADMINISTRATOR = 'Administrator',
  USER = 'User',
  SUB_USER = 'SubUser'
}

// Use proper typing for functions
const getUserById = async (id: string): Promise<User | null> => {
  // Implementation
};

// Use generics where appropriate
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
```

### React Guidelines

```typescript
// Use functional components with hooks
import React, { useState, useEffect } from 'react';

interface Props {
  userId: string;
  onUserUpdate: (user: User) => void;
}

export const UserProfile: React.FC<Props> = ({ userId, onUserUpdate }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getUserById(userId);
        setUser(userData);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h1>{user.email}</h1>
      {/* Component content */}
    </div>
  );
};
```

### Styling Guidelines

```typescript
// Use Tailwind CSS for styling
// Prefer utility classes over custom CSS
<div className="flex items-center justify-between p-4 bg-white shadow-md rounded-lg">
  <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
  <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
    Add New
  </button>
</div>

// Use CSS modules for complex components
import styles from './Dashboard.module.css';

<div className={styles.dashboardContainer}>
  {/* Component content */}
</div>
```

## 🔒 Security Guidelines

### Code Security

```typescript
// Sanitize user input
import DOMPurify from 'dompurify';

const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input);
};

// Validate data
import { z } from 'zod';

const UserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['Administrator', 'User', 'SubUser'])
});

// Use in components
const validateUser = (data: unknown) => {
  return UserSchema.parse(data);
};
```

### Authentication

```typescript
// Always check authentication
import { useAuth } from '../context/AuthContext';

const ProtectedComponent = () => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <div>Protected content</div>;
};
```

## 📚 Documentation

### Code Documentation

```typescript
/**
 * Fetches user data from the API
 * @param userId - The unique identifier of the user
 * @param options - Optional fetch options
 * @returns Promise resolving to user data or null if not found
 * @throws {Error} When API request fails
 */
const fetchUserData = async (
  userId: string,
  options?: RequestInit
): Promise<User | null> => {
  // Implementation
};
```

### Component Documentation

```typescript
/**
 * UserProfile component displays user information and allows editing
 * 
 * @example
 * ```tsx
 * <UserProfile 
 *   userId="123" 
 *   onUserUpdate={(user) => console.log(user)} 
 * />
 * ```
 */
interface UserProfileProps {
  /** The unique identifier of the user */
  userId: string;
  /** Callback function called when user data is updated */
  onUserUpdate: (user: User) => void;
  /** Optional CSS class name */
  className?: string;
}
```

## 🚨 Issue Reporting

### Bug Reports

When reporting bugs, include:

```markdown
## Bug Description
Clear description of the issue

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g. macOS, Windows, Linux]
- Browser: [e.g. Chrome, Firefox, Safari]
- Version: [e.g. 22]
- PilotForce Version: [e.g. 1.0.0]

## Additional Information
Screenshots, console logs, etc.
```

### Feature Requests

```markdown
## Feature Description
Clear description of the feature

## Use Case
Why this feature is needed

## Proposed Solution
How you think it should work

## Alternatives Considered
Other approaches you've considered
```

## 🏗️ Architecture Guidelines

### Component Structure

```
src/
├── components/
│   ├── common/           # Reusable components
│   │   ├── Button/
│   │   ├── Modal/
│   │   └── Loading/
│   ├── forms/            # Form components
│   ├── layout/           # Layout components
│   └── features/         # Feature-specific components
├── pages/                # Page components
├── hooks/                # Custom React hooks
├── utils/                # Utility functions
├── services/             # API services
├── types/                # TypeScript type definitions
└── styles/               # Global styles
```

### File Naming

- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth.ts`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Types**: PascalCase (e.g., `UserTypes.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.ts`)

## 🔄 Release Process

### Version Management

We use semantic versioning:

```bash
# Patch release (bug fixes)
npm version patch

# Minor release (new features)
npm version minor

# Major release (breaking changes)
npm version major
```

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Release notes prepared
- [ ] Deployment tested

## 📞 Getting Help

### Communication Channels

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Slack**: For real-time communication (invite required)
- **Email**: For security issues (security@pilotforce.com)

### Resources

- [React Documentation](https://reactjs.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [AWS Documentation](https://docs.aws.amazon.com/)

## 🙏 Recognition

Contributors will be recognized in:

- **README.md**: List of contributors
- **Release Notes**: Credit for contributions
- **GitHub**: Contributor statistics
- **Documentation**: Author attribution

## 📄 License

By contributing to PilotForce, you agree that your contributions will be licensed under the same license as the project.

---

**Thank you for contributing to PilotForce!** 🚀

**Contributing Guide Version**: 1.0  
**Last Updated**: January 2024  
**Next Review**: March 2024 