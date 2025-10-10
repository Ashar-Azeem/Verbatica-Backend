"use strict";
/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
class Streams {
    constructor(transport) {
        Object.defineProperty(this, "transport", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "acceptedParams", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.transport = transport;
        this.acceptedParams = {
            'streams.logs_disable': {
                path: [],
                body: [],
                query: []
            },
            'streams.logs_enable': {
                path: [],
                body: [],
                query: []
            },
            'streams.status': {
                path: [],
                body: [],
                query: []
            }
        };
    }
    async logsDisable(params, options) {
        const { path: acceptedPath } = this.acceptedParams['streams.logs_disable'];
        const userQuery = params === null || params === void 0 ? void 0 : params.querystring;
        const querystring = userQuery != null ? { ...userQuery } : {};
        let body;
        const userBody = params === null || params === void 0 ? void 0 : params.body;
        if (userBody != null) {
            if (typeof userBody === 'string') {
                body = userBody;
            }
            else {
                body = { ...userBody };
            }
        }
        params = params !== null && params !== void 0 ? params : {};
        for (const key in params) {
            if (acceptedPath.includes(key)) {
                continue;
            }
            else if (key !== 'body' && key !== 'querystring') {
                querystring[key] = params[key];
            }
        }
        const method = 'POST';
        const path = '/_streams/logs/_disable';
        const meta = {
            name: 'streams.logs_disable'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async logsEnable(params, options) {
        const { path: acceptedPath } = this.acceptedParams['streams.logs_enable'];
        const userQuery = params === null || params === void 0 ? void 0 : params.querystring;
        const querystring = userQuery != null ? { ...userQuery } : {};
        let body;
        const userBody = params === null || params === void 0 ? void 0 : params.body;
        if (userBody != null) {
            if (typeof userBody === 'string') {
                body = userBody;
            }
            else {
                body = { ...userBody };
            }
        }
        params = params !== null && params !== void 0 ? params : {};
        for (const key in params) {
            if (acceptedPath.includes(key)) {
                continue;
            }
            else if (key !== 'body' && key !== 'querystring') {
                querystring[key] = params[key];
            }
        }
        const method = 'POST';
        const path = '/_streams/logs/_enable';
        const meta = {
            name: 'streams.logs_enable'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async status(params, options) {
        const { path: acceptedPath } = this.acceptedParams['streams.status'];
        const userQuery = params === null || params === void 0 ? void 0 : params.querystring;
        const querystring = userQuery != null ? { ...userQuery } : {};
        let body;
        const userBody = params === null || params === void 0 ? void 0 : params.body;
        if (userBody != null) {
            if (typeof userBody === 'string') {
                body = userBody;
            }
            else {
                body = { ...userBody };
            }
        }
        params = params !== null && params !== void 0 ? params : {};
        for (const key in params) {
            if (acceptedPath.includes(key)) {
                continue;
            }
            else if (key !== 'body' && key !== 'querystring') {
                querystring[key] = params[key];
            }
        }
        const method = 'GET';
        const path = '/_streams/status';
        const meta = {
            name: 'streams.status'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
}
exports.default = Streams;
//# sourceMappingURL=streams.js.map