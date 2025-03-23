import { mkdtemp, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { getProgram, extractClasses } from './src-resolver';
import ts from 'typescript';

describe('src-resolver', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = await mkdtemp(join(tmpdir(), 'test-'));
  });

  afterEach(async () => {
    // Clean up the temporary directory after each test
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('getProgram', () => {
    it('should create a program with TypeScript files', async () => {
      // Create test TypeScript files
      const file1Path = join(tempDir, 'file1.ts');
      const file2Path = join(tempDir, 'file2.ts');
      const nodeModulesDir = join(tempDir, 'node_modules');
      const nodeModulesPath = join(nodeModulesDir, 'test.ts');
      const tsconfigPath = join(tempDir, 'tsconfig.json');

      // Create TypeScript files
      await writeFile(file1Path, 'export const a = 1;');
      await writeFile(file2Path, 'export const b = 2;');
      await mkdir(nodeModulesDir);
      await writeFile(nodeModulesPath, 'export const c = 3;');

      // Create tsconfig.json
      await writeFile(
        tsconfigPath,
        JSON.stringify(
          {
            compilerOptions: {
              target: 'es2016',
              module: 'commonjs',
              rootDir: tempDir,
              skipLibCheck: true,
              noResolve: true,
              types: [],
              lib: [],
            },
            exclude: ['**/node_modules/**'],
          },
          null,
          2,
        ),
      );

      const program = getProgram(tsconfigPath);

      // Verify that program is created and contains our test files
      const sourceFiles = program.getSourceFiles();
      const sourceFilePaths = sourceFiles.map(
        (file: ts.SourceFile) => file.fileName,
      );

      expect(sourceFilePaths).toContain(file1Path);
      expect(sourceFilePaths).toContain(file2Path);

      // Verify that no files from node_modules are included
      const hasNodeModulesFiles = sourceFilePaths.some((path) =>
        path.includes('node_modules'),
      );
      expect(hasNodeModulesFiles).toBe(false);
    });
  });

  describe('extractClasses', () => {
    it('should extract class declarations from TypeScript files', async () => {
      const filePath = join(tempDir, 'classes.ts');
      const tsconfigPath = join(tempDir, 'tsconfig.json');

      // Create a TypeScript file with multiple classes
      const fileContent = `
        export class User {
          constructor(public name: string) {}
        }

        export class Post {
          constructor(public title: string) {}
        }

        // This should be ignored
        const notAClass = {};

        export class Comment {
          constructor(public text: string) {}
        }
      `;

      await writeFile(filePath, fileContent);
      await writeFile(
        tsconfigPath,
        JSON.stringify(
          {
            compilerOptions: {
              target: 'es2016',
              module: 'commonjs',
              rootDir: tempDir,
              skipLibCheck: true,
              noResolve: true,
              types: [],
              lib: [],
            },
          },
          null,
          2,
        ),
      );

      const program = getProgram(tsconfigPath);
      const classes = extractClasses(program);

      expect(classes).toHaveLength(3);
      expect(classes.every((cls) => ts.isClassDeclaration(cls))).toBe(true);
      expect(classes.map((cls) => cls.name?.text)).toEqual([
        'User',
        'Post',
        'Comment',
      ]);
    });

    it('should ignore classes without names', async () => {
      const filePath = join(tempDir, 'anonymous-class.ts');
      const tsconfigPath = join(tempDir, 'tsconfig.json');

      const fileContent = `
        export const anonymousClass = class {
          constructor(public name: string) {}
        };

        export class NamedClass {
          constructor(public title: string) {}
        }
      `;

      await writeFile(filePath, fileContent);
      await writeFile(
        tsconfigPath,
        JSON.stringify(
          {
            compilerOptions: {
              target: 'es2016',
              module: 'commonjs',
              rootDir: tempDir,
              skipLibCheck: true,
              noResolve: true,
              types: [],
              lib: [],
            },
          },
          null,
          2,
        ),
      );

      const program = getProgram(tsconfigPath);
      const classes = extractClasses(program);

      expect(classes).toHaveLength(1);
      expect(classes[0].name?.text).toBe('NamedClass');
    });
  });
});
