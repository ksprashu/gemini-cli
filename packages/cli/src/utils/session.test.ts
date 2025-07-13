/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveSessionState, loadSessionState } from './session.js';
import { Config, HistoryItem } from '@google/gemini-cli-core';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

describe('session utils', () => {
  const mockConfig = {
    getProjectRoot: () => '/test/project',
    getGeminiClient: () => ({
      getHistory: async () => [{ role: 'user', parts: [{ text: 'test' }] }],
      setHistory: async () => {},
    }),
  } as unknown as Config;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('saveSessionState', () => {
    it('should save the session state to a file', async () => {
      await saveSessionState(mockConfig);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('session_state.json'),
        expect.any(String),
      );
    });
  });

  describe('loadSessionState', () => {
    it('should load the session state from a file', async () => {
      const mockHistory: HistoryItem[] = [
        { id: 1, type: 'user', text: 'hello' },
      ];
      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify({ history: mockHistory }),
      );
      const history = await loadSessionState(mockConfig);
      expect(history).toEqual(mockHistory);
    });

    it('should return an empty array if the file does not exist', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));
      const history = await loadSessionState(mockConfig);
      expect(history).toEqual([]);
    });
  });
});
