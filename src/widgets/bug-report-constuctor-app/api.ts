import {SavedBlocks} from "./types.ts";
import {HostAPI} from "../../../@types/globals";

export class API {
    constructor(private host: HostAPI) {}

    async getSavedBlocks(): Promise<SavedBlocks> {
        return this.fetch('/api/saved-blocks', {method: 'GET'});
    }

    async fetch<T = Record<string, unknown>>(path: string, options?: Record<string, unknown>): Promise<T> {
        return await this.host.fetchApp<T>(path, {...options, scope: true})
    }
}
