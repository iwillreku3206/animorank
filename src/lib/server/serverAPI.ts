import type { FastifyPluginCallback } from 'fastify';

export abstract class ServerAPI {
  public abstract fastifyPlugin(): Promise<FastifyPluginCallback>;
}
