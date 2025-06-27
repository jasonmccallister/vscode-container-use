import { dag, Container, argument, Directory, object, func } from "@dagger.io/dagger";

// Constants following TypeScript best practices
const CONTAINER_CONFIG = {
  IMAGE: "ubuntu:24.04",
  WORK_DIR: "/mnt",
  TIMEOUT: 300, // 5 minutes
} as const;

// Type for yarn script commands
type YarnScript = "check-types" | "lint" | "compile" | "package" | "compile-tests" | "test:unit" | "test:ci" | "test";

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
    return await this.runYarnScripts(["test"]);
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
      .from(CONTAINER_CONFIG.IMAGE)
      .withMountedDirectory(CONTAINER_CONFIG.WORK_DIR, this.source)
      .withWorkdir(CONTAINER_CONFIG.WORK_DIR)
      .withEnvVariable("DISPLAY", ":99.0")
      .withExec(["apt-get", "update"])
      .withExec([
        "apt-get",
        "install",
        "-y",
        "curl",
        "xvfb",
        "libglib2.0-0",
        "libnss3",
        "libatk-bridge2.0-0",
        "libdrm2",
        "libxcomposite1",
        "libxdamage1",
        "libxrandr2",
        "libgbm1",
        "libxss1",
        "libatspi2.0-0",
        "libgtk-3-0"
      ])
      .withExec(["bash", "-c", "curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -"])
      .withExec(["apt-get", "install", "-y", "nodejs"])
      .withExec(["npm", "install", "-g", "yarn"])
      .withExec(["yarn", "install", "--frozen-lockfile"]);
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

  @func()
  async testWithDisplay(): Promise<string> {
    // Run full VS Code tests with xvfb for headless display
    const container = await this.buildEnvironment();

    return container
      .withExec(["xvfb-run", "-a", "yarn", "test"])
      .stdout();
  }

  // Note: VS Code extension tests can now run in containers with xvfb for headless display
  // Use `testWithDisplay()` for full VS Code integration testing in containers
  // Use `test()` and `unitTest()` for faster CI validation focusing on type checking and linting
  // This provides flexibility for both quick validation and comprehensive testing
}
