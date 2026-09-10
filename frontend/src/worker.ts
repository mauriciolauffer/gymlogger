export interface Env {
  API: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return env.API.fetch(request);
  },
} satisfies ExportedHandler<Env>;
