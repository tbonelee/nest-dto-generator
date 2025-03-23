import { mkdtemp, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  getProgram,
  extractClasses,
  filterControllerClasses,
} from '../src/analyzers/src-resolver';
import * as ts from 'typescript';

describe('src-resolver', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'test-'));
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('getProgram', () => {
    it('should create a program with TypeScript files', async () => {
      const file1Path = join(tempDir, 'file1.ts');
      const file2Path = join(tempDir, 'file2.ts');
      const nodeModulesDir = join(tempDir, 'node_modules');
      const nodeModulesPath = join(nodeModulesDir, 'test.ts');
      const tsconfigPath = join(tempDir, 'tsconfig.json');

      await writeFile(file1Path, 'export const a = 1;');
      await writeFile(file2Path, 'export const b = 2;');
      await mkdir(nodeModulesDir);
      await writeFile(nodeModulesPath, 'export const c = 3;');

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
      const sourceFiles = program.getSourceFiles();
      const sourceFilePaths = sourceFiles.map(
        (file: ts.SourceFile) => file.fileName,
      );

      expect(sourceFilePaths).toContain(file1Path);
      expect(sourceFilePaths).toContain(file2Path);

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

      const fileContent = `
        export class User {
          constructor(public name: string) {}
        }

        export class Post {
          constructor(public title: string) {}
        }

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
  });

  describe('filterControllerClasses', () => {
    it('should identify controller classes', async () => {
      const tsconfigPath = join(tempDir, 'tsconfig.json');
      const controllerPath = join(tempDir, 'user.controller.ts');

      const fileContent = `
        import { Controller, Get, Post, Body } from '@nestjs/common';

        @Controller('users')
        export class UserController {
          @Get()
          findAll() {
            return [];
          }

          @Post()
          create(@Body() createUserDto: any) {
            return createUserDto;
          }
        }

        export class NotAController {
          method() {}
        }
      `;

      await writeFile(controllerPath, fileContent);
      await writeFile(
        tsconfigPath,
        JSON.stringify(
          {
            compilerOptions: {
              target: 'es2016',
              module: 'commonjs',
              experimentalDecorators: true,
              emitDecoratorMetadata: true,
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
      const controllers = filterControllerClasses(classes);

      expect(controllers).toHaveLength(1);
      expect(controllers[0].name?.text).toBe('UserController');
    });
  });
});
