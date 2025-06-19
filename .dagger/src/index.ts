import { dag, Container, argument, Directory, object, func } from "@dagger.io/dagger";

@object()
export class VscodeContainerUse {

  private source: Directory;

  constructor(
    @argument({ defaultPath: "/" }) source: Directory,
  ) {
    this.source = source;
  }

  @func()
  async test(): Promise<string> {
    const container = await this.buildEnvironment();

    return await container.withExec(["yarn", "run", "test"]).stdout();
  }

  @func()
  async buildEnvironment(): Promise<Container> {
    return dag
      .container()
      .from("node:lts-alpine")
      .withMountedDirectory("/mnt", this.source)
      .withWorkdir("/mnt")
      .withExec(["yarn", "install"]);
  }
}
