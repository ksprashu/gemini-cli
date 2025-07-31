/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  populateMcpServerCommand,
  createTransport,
  isEnabled,
  discoverTools,
  discoverPrompts,
  resolveHeaders,
} from './mcp-client.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import * as SdkClientStdioLib from '@modelcontextprotocol/sdk/client/stdio.js';
import * as ClientLib from '@modelcontextprotocol/sdk/client/index.js';
import * as GenAiLib from '@google/genai';
import { GoogleCredentialProvider } from '../mcp/google-auth-provider.js';
import { AuthProviderType } from '../config/config.js';
import { PromptRegistry } from '../prompts/prompt-registry.js';

import { DiscoveredMCPTool } from './mcp-tool.js';

vi.mock('@modelcontextprotocol/sdk/client/stdio.js');
vi.mock('@modelcontextprotocol/sdk/client/index.js');
vi.mock('@google/genai');
vi.mock('../mcp/oauth-provider.js');
vi.mock('../mcp/oauth-token-storage.js');
vi.mock('./mcp-tool.js');

describe('mcp-client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('discoverTools', () => {
    it('should discover tools', async () => {
      const mockedClient = {} as unknown as ClientLib.Client;
      const mockedMcpToTool = vi.mocked(GenAiLib.mcpToTool).mockReturnValue({
        tool: () => ({
          functionDeclarations: [
            {
              name: 'testFunction',
            },
          ],
        }),
      } as unknown as GenAiLib.CallableTool);

      const tools = await discoverTools('test-server', {}, mockedClient);

      expect(tools.length).toBe(1);
      expect(mockedMcpToTool).toHaveBeenCalledOnce();
    });

    it('should log an error if there is an error discovering a tool', async () => {
      const mockedClient = {} as unknown as ClientLib.Client;
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {
          // no-op
        });

      const testError = new Error('Invalid tool name');
      vi.mocked(DiscoveredMCPTool).mockImplementation(
        (
          _mcpCallableTool: GenAiLib.CallableTool,
          _serverName: string,
          name: string,
        ) => {
          if (name === 'invalid tool name') {
            throw testError;
          }
          return { name: 'validTool' } as DiscoveredMCPTool;
        },
      );

      vi.mocked(GenAiLib.mcpToTool).mockReturnValue({
        tool: () =>
          Promise.resolve({
            functionDeclarations: [
              {
                name: 'validTool',
              },
              {
                name: 'invalid tool name', // this will fail validation
              },
            ],
          }),
      } as unknown as GenAiLib.CallableTool);

      const tools = await discoverTools('test-server', {}, mockedClient);

      expect(tools.length).toBe(1);
      expect(tools[0].name).toBe('validTool');
      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Error discovering tool: 'invalid tool name' from MCP server 'test-server': ${testError.message}`,
      );
    });
  });

  describe('discoverPrompts', () => {
    const mockedPromptRegistry = {
      registerPrompt: vi.fn(),
    } as unknown as PromptRegistry;

    it('should discover and log prompts', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        prompts: [
          { name: 'prompt1', description: 'desc1' },
          { name: 'prompt2' },
        ],
      });
      const mockedClient = {
        request: mockRequest,
      } as unknown as ClientLib.Client;

      await discoverPrompts('test-server', mockedClient, mockedPromptRegistry);

      expect(mockRequest).toHaveBeenCalledWith(
        { method: 'prompts/list', params: {} },
        expect.anything(),
      );
    });

    it('should do nothing if no prompts are discovered', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        prompts: [],
      });
      const mockedClient = {
        request: mockRequest,
      } as unknown as ClientLib.Client;

      const consoleLogSpy = vi
        .spyOn(console, 'debug')
        .mockImplementation(() => {
          // no-op
        });

      await discoverPrompts('test-server', mockedClient, mockedPromptRegistry);

      expect(mockRequest).toHaveBeenCalledOnce();
      expect(consoleLogSpy).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it('should log an error if discovery fails', async () => {
      const testError = new Error('test error');
      testError.message = 'test error';
      const mockRequest = vi.fn().mockRejectedValue(testError);
      const mockedClient = {
        request: mockRequest,
      } as unknown as ClientLib.Client;

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {
          // no-op
        });

      await discoverPrompts('test-server', mockedClient, mockedPromptRegistry);

      expect(mockRequest).toHaveBeenCalledOnce();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Error discovering prompts from test-server: ${testError.message}`,
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('appendMcpServerCommand', () => {
    it('should do nothing if no MCP servers or command are configured', () => {
      const out = populateMcpServerCommand({}, undefined);
      expect(out).toEqual({});
    });

    it('should discover tools via mcpServerCommand', () => {
      const commandString = 'command --arg1 value1';
      const out = populateMcpServerCommand({}, commandString);
      expect(out).toEqual({
        mcp: {
          command: 'command',
          args: ['--arg1', 'value1'],
        },
      });
    });

    it('should handle error if mcpServerCommand parsing fails', () => {
      expect(() => populateMcpServerCommand({}, 'derp && herp')).toThrowError();
    });
  });

  describe('createTransport', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = {};
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    describe('should connect via httpUrl', () => {
      it('without headers', async () => {
        const transport = await createTransport(
          'test-server',
          {
            httpUrl: 'http://test-server',
          },
          false,
        );

        expect(transport).toEqual(
          new StreamableHTTPClientTransport(new URL('http://test-server'), {}),
        );
      });

      it('with headers', async () => {
        const transport = await createTransport(
          'test-server',
          {
            httpUrl: 'http://test-server',
            headers: { Authorization: 'derp' },
          },
          false,
        );

        expect(transport).toEqual(
          new StreamableHTTPClientTransport(new URL('http://test-server'), {
            requestInit: {
              headers: { Authorization: 'derp' },
            },
          }),
        );
      });
    });

    describe('should connect via url', () => {
      it('without headers', async () => {
        const transport = await createTransport(
          'test-server',
          {
            url: 'http://test-server',
          },
          false,
        );
        expect(transport).toEqual(
          new SSEClientTransport(new URL('http://test-server'), {}),
        );
      });

      it('with headers', async () => {
        const transport = await createTransport(
          'test-server',
          {
            url: 'http://test-server',
            headers: { Authorization: 'derp' },
          },
          false,
        );

        expect(transport).toEqual(
          new SSEClientTransport(new URL('http://test-server'), {
            requestInit: {
              headers: { Authorization: 'derp' },
            },
          }),
        );
      });
    });

    it('should connect via command', async () => {
      const mockedTransport = vi.mocked(SdkClientStdioLib.StdioClientTransport);

      await createTransport(
        'test-server',
        {
          command: 'test-command',
          args: ['--foo', 'bar'],
          env: { FOO: 'bar' },
          cwd: 'test/cwd',
        },
        false,
      );

      expect(mockedTransport).toHaveBeenCalledWith({
        command: 'test-command',
        args: ['--foo', 'bar'],
        cwd: 'test/cwd',
        env: { FOO: 'bar' },
        stderr: 'pipe',
      });
    });

    describe('useGoogleCredentialProvider', () => {
      it('should use GoogleCredentialProvider when specified', async () => {
        const transport = await createTransport(
          'test-server',
          {
            httpUrl: 'http://test-server',
            authProviderType: AuthProviderType.GOOGLE_CREDENTIALS,
            oauth: {
              scopes: ['scope1'],
            },
          },
          false,
        );

        expect(transport).toBeInstanceOf(StreamableHTTPClientTransport);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const authProvider = (transport as any)._authProvider;
        expect(authProvider).toBeInstanceOf(GoogleCredentialProvider);
      });

      it('should use GoogleCredentialProvider with SSE transport', async () => {
        const transport = await createTransport(
          'test-server',
          {
            url: 'http://test-server',
            authProviderType: AuthProviderType.GOOGLE_CREDENTIALS,
            oauth: {
              scopes: ['scope1'],
            },
          },
          false,
        );

        expect(transport).toBeInstanceOf(SSEClientTransport);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const authProvider = (transport as any)._authProvider;
        expect(authProvider).toBeInstanceOf(GoogleCredentialProvider);
      });

      it('should throw an error if no URL is provided with GoogleCredentialProvider', async () => {
        await expect(
          createTransport(
            'test-server',
            {
              authProviderType: AuthProviderType.GOOGLE_CREDENTIALS,
              oauth: {
                scopes: ['scope1'],
              },
            },
            false,
          ),
        ).rejects.toThrow(
          'No URL configured for Google Credentials MCP server',
        );
      });
    });
  });
  describe('isEnabled', () => {
    const funcDecl = { name: 'myTool' };
    const serverName = 'myServer';

    it('should return true if no include or exclude lists are provided', () => {
      const mcpServerConfig = {};
      expect(isEnabled(funcDecl, serverName, mcpServerConfig)).toBe(true);
    });

    it('should return false if the tool is in the exclude list', () => {
      const mcpServerConfig = { excludeTools: ['myTool'] };
      expect(isEnabled(funcDecl, serverName, mcpServerConfig)).toBe(false);
    });

    it('should return true if the tool is in the include list', () => {
      const mcpServerConfig = { includeTools: ['myTool'] };
      expect(isEnabled(funcDecl, serverName, mcpServerConfig)).toBe(true);
    });

    it('should return true if the tool is in the include list with parentheses', () => {
      const mcpServerConfig = { includeTools: ['myTool()'] };
      expect(isEnabled(funcDecl, serverName, mcpServerConfig)).toBe(true);
    });

    it('should return false if the include list exists but does not contain the tool', () => {
      const mcpServerConfig = { includeTools: ['anotherTool'] };
      expect(isEnabled(funcDecl, serverName, mcpServerConfig)).toBe(false);
    });

    it('should return false if the tool is in both the include and exclude lists', () => {
      const mcpServerConfig = {
        includeTools: ['myTool'],
        excludeTools: ['myTool'],
      };
      expect(isEnabled(funcDecl, serverName, mcpServerConfig)).toBe(false);
    });

    it('should return false if the function declaration has no name', () => {
      const namelessFuncDecl = {};
      const mcpServerConfig = {};
      expect(isEnabled(namelessFuncDecl, serverName, mcpServerConfig)).toBe(
        false,
      );
    });
  });
  describe('resolveHeaders', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = {};
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return undefined if no headers are provided', () => {
      expect(resolveHeaders(undefined)).toBeUndefined();
    });

    it('should resolve environment variables in header values', () => {
      process.env.MY_TOKEN = 'my-secret-token';
      const headers = {
        Authorization: 'Bearer $MY_TOKEN',
        'X-Another-Header': 'some-value',
      };
      const resolved = resolveHeaders(headers);
      expect(resolved).toEqual({
        Authorization: 'Bearer my-secret-token',
        'X-Another-Header': 'some-value',
      });
    });

    it('should resolve environment variables with curly braces', () => {
      process.env.MY_TOKEN = 'my-secret-token';
      const headers = {
        Authorization: 'Bearer ${MY_TOKEN}',
      };
      const resolved = resolveHeaders(headers);
      expect(resolved).toEqual({
        Authorization: 'Bearer my-secret-token',
      });
    });

    it('should handle multiple environment variables in a single header', () => {
      process.env.VAR1 = 'value1';
      process.env.VAR2 = 'value2';
      const headers = {
        'X-Custom-Header': '$VAR1-$VAR2',
      };
      const resolved = resolveHeaders(headers);
      expect(resolved).toEqual({
        'X-Custom-Header': 'value1-value2',
      });
    });

    it('should handle undefined environment variables', () => {
      const headers = {
        Authorization: 'Bearer $UNDEFINED_VAR',
      };
      const resolved = resolveHeaders(headers);
      expect(resolved).toEqual({
        Authorization: 'Bearer ',
      });
    });

    it('should return an empty object if headers are empty', () => {
      const headers = {};
      const resolved = resolveHeaders(headers);
      expect(resolved).toEqual({});
    });

    it('should pass through headers with no variables', () => {
      const headers = {
        Authorization: 'Bearer my-secret-token',
        'X-Another-Header': 'some-value',
      };
      const resolved = resolveHeaders(headers);
      expect(resolved).toEqual(headers);
    });

    it('should handle environment variables set to an empty string', () => {
      process.env.EMPTY_VAR = '';
      const headers = {
        Authorization: 'Bearer $EMPTY_VAR',
      };
      const resolved = resolveHeaders(headers);
      expect(resolved).toEqual({
        Authorization: 'Bearer ',
      });
    });

    it('should handle case-insensitive environment variables', () => {
      process.env.my_token = 'my-secret-token';
      const headers = {
        Authorization: 'Bearer $my_token',
      };
      const resolved = resolveHeaders(headers);
      expect(resolved).toEqual({
        Authorization: 'Bearer my-secret-token',
      });
    });

    it('should handle a standalone dollar sign', () => {
      const headers = {
        Authorization: 'Bearer $ not a var',
      };
      const resolved = resolveHeaders(headers);
      expect(resolved).toEqual({
        Authorization: 'Bearer $ not a var',
      });
    });
  });
});
