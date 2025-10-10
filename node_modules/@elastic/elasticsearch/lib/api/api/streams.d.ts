import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
interface That {
    transport: Transport;
    acceptedParams: Record<string, {
        path: string[];
        body: string[];
        query: string[];
    }>;
}
export default class Streams {
    transport: Transport;
    acceptedParams: Record<string, {
        path: string[];
        body: string[];
        query: string[];
    }>;
    constructor(transport: Transport);
    /**
      * Disable the Logs Streams feature for this cluster
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/9.1/streams-logs-disable.html | Elasticsearch API documentation}
      */
    logsDisable(this: That, params?: T.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    logsDisable(this: That, params?: T.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    logsDisable(this: That, params?: T.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Enable the Logs Streams feature for this cluster
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/9.1/streams-logs-enable.html | Elasticsearch API documentation}
      */
    logsEnable(this: That, params?: T.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    logsEnable(this: That, params?: T.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    logsEnable(this: That, params?: T.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Return the current status of the streams feature for each streams type
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/9.1/streams-status.html | Elasticsearch API documentation}
      */
    status(this: That, params?: T.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    status(this: That, params?: T.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    status(this: That, params?: T.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
}
export {};
