import {OutputFormatsPayload, Project, ProjectCustomField, SavedBlocks} from './types.ts';
import {HostAPI} from "../../../@types/globals";


export class API {
    constructor(private host: HostAPI) {}

    private static extractError(value: unknown): string | null {
        if (!value || typeof value !== 'object') {
            return null;
        }

        const record = value as Record<string, unknown>;
        const err = record.error;
        return typeof err === 'string' && err.trim() ? err : null;
    }

    getBaseUrl(): string {
        const baseUrl = this.host.getBaseUrl?.() || '';
        // Normalize the URL to ensure it ends with a slash
        return baseUrl.charAt(baseUrl.length - 1) === '/' ? baseUrl : `${baseUrl}/`;
    }

    async getUserProjects(): Promise<Project[]> {
        return await this.host.fetchYouTrack('admin/projects?fields=id,name,shortName');
    }

    async getProjectCustomFields(projectId: string): Promise<ProjectCustomField[]> {
        return await this.host.fetchYouTrack(`admin/projects/${projectId}/customFields?fields=id,field(id,name)`);
    }

    async getSavedBlocks(): Promise<SavedBlocks> {
        return this.fetch('saved-blocks', {method: 'GET'});
    }

    async setSavedBlocks(blocks: SavedBlocks): Promise<SavedBlocks> {
        return await this.fetch<SavedBlocks>("saved-blocks", {
            method: 'POST',
            // Ring UI `HTTP` client will JSON-serialize `body` when `sendRawBody` is `false`.
            // Without it, an object body may be treated as a raw body and the request might not be sent.
            sendRawBody: false,
            body: blocks,
            headers: {
                'Content-Type': 'application/json'
            }
        })
    }

    async getOutputFormats(): Promise<OutputFormatsPayload> {
        return this.fetch('output-formats', {method: 'GET'});
    }

    async setOutputFormats(payload: OutputFormatsPayload): Promise<OutputFormatsPayload> {
        return await this.fetch<OutputFormatsPayload>('output-formats', {
            method: 'POST',
            sendRawBody: false,
            body: payload,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    async fetch<T = Record<string, unknown>>(path: string, options?: Record<string, unknown>): Promise<T> {
        // `fetchApp` expects the backend endpoint to be addressed as `backend/<path>`.
        // Do not force `scope` here: incorrect scoping may prevent request dispatch in the host.
        const result = await this.host.fetchApp<T>(`backend/${path}`, {...options});
        const error = API.extractError(result);
        if (error) {
            throw new Error(error);
        }

        return result;
    }
}
