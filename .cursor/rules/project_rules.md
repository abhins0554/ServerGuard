Every project must have its own set of rules.
Define clear guidelines at the start of each project covering coding standards, UI/UX principles, API design, and deployment processes.

All UI designs should follow a consistent style and pattern.
Use a shared design system or style guide to ensure uniform colors, typography, spacing, and interaction patterns across all screens and components.

APIs must follow standard REST protocols.
Design APIs using RESTful principles, including proper use of HTTP methods (GET, POST, PUT, DELETE), status codes, and stateless communication.

Code must be clean, well-commented, and easy to read.
Write code that is simple and understandable. Use meaningful variable/function names and add comments where the logic is complex or non-obvious.

Use consistent naming conventions for files, variables, and functions.
Stick to a naming convention (e.g., camelCase for variables, PascalCase for components) and apply it consistently throughout the project.

Always write unit tests for critical features.
Create automated tests to verify core functionalities and catch regressions early, ensuring code reliability and maintainability.

Use environment variables for configuration settings.
Store sensitive data and environment-specific settings (e.g., API keys, database URLs) in environment variables rather than hardcoding them.

Document setup instructions and key processes.
Maintain clear documentation for installing dependencies, running the app locally, deploying, and troubleshooting common issues.

All code should be peer-reviewed before merging.
Use code reviews to catch bugs, ensure coding standards, and share knowledge among team members before integrating changes.

Avoid hardcoding values in the codebase.
Use constants, configuration files, or environment variables instead of fixed values to improve flexibility and ease of updates.

Follow security best practices (e.g., input validation, authentication).
Validate user inputs, handle authentication securely, protect against common vulnerabilities like SQL injection and XSS, and manage user sessions carefully.

Handle errors gracefully and log them properly.
Provide user-friendly error messages, catch exceptions where appropriate, and maintain logs to help diagnose issues quickly.

Reuse common components and avoid duplication.
Create modular, reusable UI components and utility functions to reduce code repetition and simplify maintenance.

Ensure mobile responsiveness for all UI screens.
Design layouts that adapt to various screen sizes and orientations, providing a good user experience on phones, tablets, and desktops.

Keep third-party dependencies up to date.
Regularly update libraries and frameworks to benefit from bug fixes, performance improvements, and security patches.

Keep designs and code in sync — update both as needed.
When UI or UX changes are made, ensure corresponding updates in both design assets and implemented code to maintain consistency.

Follow agreed coding standards (e.g., PEP8, ESLint).
Use linting tools and style guides appropriate for your tech stack to enforce uniform code style and reduce errors.

Regularly back up important data and configurations.
Implement backups for databases, configuration files, and critical assets to prevent data loss and enable quick recovery.