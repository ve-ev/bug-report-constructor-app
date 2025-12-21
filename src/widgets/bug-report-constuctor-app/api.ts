import {SavedBlocks} from "./types.ts";
import {HostAPI} from "../../../@types/globals";

export class API {
    constructor(private host: HostAPI) {}

    async getSavedBlocks(): Promise<SavedBlocks> {
        return this.fetch('saved-blocks', {method: 'GET'});
    }

    async setSavedBlocks(blocks: SavedBlocks): Promise<SavedBlocks> {
        return await this.fetch<SavedBlocks>("saved-blocks", {method: 'POST', body: blocks})
    }

    async fetch<T = Record<string, unknown>>(path: string, options?: Record<string, unknown>): Promise<T> {
        return await this.host.fetchApp<T>(`backend/${path}`, {...options, scope: true})
    }
}
