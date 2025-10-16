/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DEFAULT_GEMINI_FLASH_LITE_MODEL,
  DEFAULT_GEMINI_FLASH_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_MODEL_AUTO,
} from '@google/gemini-cli-core';
import { test } from './test-helper.js';
import { describe, it, expect } from 'vitest';

const ALL_MODELS = [
  DEFAULT_GEMINI_MODEL_AUTO,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_FLASH_MODEL,
  DEFAULT_GEMINI_FLASH_LITE_MODEL,
];

describe('/model slash command', () => {
  it('should set a valid model', async () => {
    const { instance } = await test();
    instance.stdin.write('/model gemini-1.5-pro\r');
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(instance.lastFrame()).toContain('Model set to: gemini-1.5-pro');
  });

  it('should show an error for an invalid model', async () => {
    const { instance } = await test();
    instance.stdin.write('/model invalid-model\r');
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(instance.lastFrame()).toContain(
      `Invalid model: invalid-model. Available models: ${ALL_MODELS.join(
        ', ',
      )}`,
    );
  });

  it('should show an error when no model is provided', async () => {
    const { instance } = await test();
    instance.stdin.write('/model\r');
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(instance.lastFrame()).toContain(
      `Please provide a model. Available models: ${ALL_MODELS.join(', ')}`,
    );
  });
});
