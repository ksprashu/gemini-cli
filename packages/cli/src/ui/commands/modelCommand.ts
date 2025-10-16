/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SlashCommand } from './types.js';
import { CommandKind } from './types.js';

export const modelCommand: SlashCommand = {
  name: 'model',
  description:
    'Sets the model to use for the next request (e.g. /model gemini-2.5-flash)',
  kind: CommandKind.BUILT_IN,
  action: (context, args) => {
    if (context.services.config) {
      context.services.config.setModel(args);
    }
    return Promise.resolve(undefined);
  },
};
