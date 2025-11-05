# Agent Guidelines for C# Projects Raycast Extension

## Commands

- `npm run dev` - Start development with live reload
- `npm run build` - Build extension for production
- `npm run lint` - Run ESLint checks
- `npm run fix-lint` - Auto-fix linting issues
- No test commands configured

## Code Style

- **TypeScript**: Strict mode enabled (`strict: true`), target ES2023
- **Formatting**: Prettier with 120 char width, double quotes
- **Imports**: Use named imports from `@raycast/api` and `@raycast/utils`
- **Components**: React functional components with JSX (react-jsx transform)
- **Naming**: PascalCase for components/functions, camelCase for variables/interfaces
- **Types**: Explicit interface definitions for all data structures
- **Error Handling**: Use try-catch blocks, log errors with `console.error`, silent failures for inaccessible directories
- **Async/Await**: Prefer async/await over promises, use `usePromise` hook for React components

## Project Features

- Searches for `.sln` and `.slnx` files recursively without depth limit
- Stops searching subdirectories when solution found in parent folder
- Excludes: `bin`, `obj`, `node_modules`, `packages`, `.vs`, `.vscode`, `.idea`, `.git`, `Debug`, `Release`, `TestResults`, `dist`, `build`
- Always excludes folders starting with `.`
- Default action: Open in Rider (primary IDE)
- Alternative actions: VS Code (Cmd+V), Open With (Cmd+O), Show in Finder (Cmd+F), Copy Path (Cmd+C)
