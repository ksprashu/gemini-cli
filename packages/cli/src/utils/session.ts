/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { promises as fs } from 'fs';
import path from 'path';
import { Config, getProjectTempDir } from '@google/gemini-cli-core';
import { HistoryItem } from '../ui/types.js';

const SESSION_STATE_FILE = 'session_state.json';

function getSessionStatePath(config: Config): string {
  return path.join(getProjectTempDir(config.getProjectRoot()), SESSION_STATE_FILE);
}

export async function saveSessionState(config: Config): Promise<void> {
  try {
    const history = await config.getGeminiClient().getHistory();
    const sessionState = {
      history,
    };
    const statePath = getSessionStatePath(config);
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    await fs.writeFile(statePath, JSON.stringify(sessionState, null, 2));
  } catch (error) {
    // Silently fail, as this is a non-critical operation.
    console.debug('Failed to save session state:', error);
  }
}

export async function loadSessionState(config: Config): Promise<HistoryItem[]> {
  try {
    const statePath = getSessionStatePath(config);
    const stateContent = await fs.readFile(statePath, 'utf-8');
    const sessionState = JSON.parse(stateContent);
    if (sessionState.history) {
      await config.getGeminiClient().setHistory(sessionState.history);
      return sessionState.history;
    }
  } catch (error) {
    // Silently fail, as this is a non-critical operation.
    console.debug('Failed to load session state:', error);
  }
  return [];
}
