export abstract class Plugin {
  public abstract init(): Promise<void>;
}
