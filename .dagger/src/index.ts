import { dag, Container, argument, Directory, object, func } from "@dagger.io/dagger";

// Constants following TypeScript best practices
const CONTAINER_CONFIG = {
  NODE_IMAGE: "node:lts-alpine",
  WORK_DIR: "/mnt",
  TIMEOUT: 300, // 5 minutes
} as const;

// Type for yarn script commands
type YarnScript = "check-types" | "lint" | "compile" | "package" | "compile-tests" | "test:unit" | "test:ci";

// Interface for test configuration
interface TestConfig {
  readonly skipVscodeTests?: boolean;
  readonly includeE2e?: boolean;
}

// Interface for container execution result
interface ExecutionResult {
  readonly stdout: string;
  readonly success: boolean;
}

@object()
export class VscodeContainerUse {
  private readonly source: Directory;

  constructor(
    @argument({ defaultPath: "/" }) source: Directory,
  ) {
    this.source = source;
  }

  @func()
  async test(): Promise<string> {
    // Run CI-appropriate tests (type checking and linting)
    return await this.runYarnScripts(["test:ci"]);
  }

  @func()
  async unitTest(): Promise<string> {
    // Run unit tests (type checking and linting only)
    return await this.runYarnScripts(["test:unit"]);
  }

  @func()
  async buildEnvironment(): Promise<Container> {
    return dag
      .container()
      .from(CONTAINER_CONFIG.NODE_IMAGE)
      .withMountedDirectory(CONTAINER_CONFIG.WORK_DIR, this.source)
      .withWorkdir(CONTAINER_CONFIG.WORK_DIR)
      .withExec(["yarn", "install"]);
  }

  /**
   * Helper method to run yarn scripts with consistent error handling
   */
  private async runYarnScripts(scripts: readonly YarnScript[]): Promise<string> {
    const container = await this.buildEnvironment();
    
    // Chain execution of scripts using reduce for better error handling
    const finalContainer = scripts.reduce(
      (containerPromise, script) => 
        containerPromise.then(c => c.withExec(["yarn", "run", script])),
      Promise.resolve(container)
    );

    return (await finalContainer).stdout();
  }

  @func()
  async buildPackage(): Promise<string> {
    // Build the extension package
    return await this.runYarnScripts(["package"]);
  }

  @func()
  async compileTests(): Promise<string> {
    // Compile test files without running VS Code tests
    return await this.runYarnScripts(["compile-tests"]);
  }

  // Note: VS Code extension tests cannot run in containers without a display
  // Use `yarn test` locally for full integration testing
  // Container tests focus on: type checking, linting, and compilation
  // This ensures CI can validate code quality without requiring VS Code runtime
}
