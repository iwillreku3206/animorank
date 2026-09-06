export abstract class ServerPlugin {
  public abstract init(): Promise<void>;
}
