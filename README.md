# Nest DTO Generator

A tool to generate DTOs from NestJS controllers by analyzing TypeScript source code.

## Features

- Analyzes NestJS controllers using TypeScript Compiler API
- Resolves controller paths from decorators
- Supports various path formats:
  - String literals: `@Controller('users')`
  - String arrays: `@Controller(['users', 'v1'])`
  - Object options: `@Controller({ path: 'users' })`
  - Variable references: `@Controller(API_PATH)`

## Usage

```bash
# Install
npm install nest-dto-generator

# Run
nest-dto-generator generate
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test
```

## License

MIT
