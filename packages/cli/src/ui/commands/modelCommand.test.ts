/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { modelCommand } from './modelCommand.js';
import { type CommandContext } from './types.js';
import { createMockCommandContext } from '../../test-utils/mockCommandContext.js';
import { type Config } from '@google/gemini-cli-core';

describe('modelCommand', () => {
  let mockContext: CommandContext;
  const mockConfig = {
    setModel: vi.fn(),
  } as unknown as Config;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockCommandContext({
      services: {
        config: mockConfig,
      },
    });
  });

  it('updates the model when a valid model is provided', async () => {
    if (!modelCommand.action) {
      throw new Error('The model command must have an action.');
    }

    const testModel = 'gemini-2.5-flash';
    await modelCommand.action(mockContext, testModel);

    expect(mockConfig.setModel).toHaveBeenCalledWith(testModel);
  });

  it('should have the correct name and description', () => {
    expect(modelCommand.name).toBe('model');
    expect(modelCommand.description).toBe(
      'Sets the model to use for the next request (e.g. /model gemini-2.5-flash)',
    );
  });
});
