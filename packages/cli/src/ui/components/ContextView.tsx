/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Text } from 'ink';
import type { PartListUnion } from '@google/genai';

interface ContextViewProps {
  contextForModel: PartListUnion | null;
}

export function ContextView(props: ContextViewProps) {
  const { contextForModel } = props;

  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      <Text bold>Context Sent to Model</Text>
      <Box marginTop={1}>
        <Text>{JSON.stringify(contextForModel, null, 2)}</Text>
      </Box>
    </Box>
  );
}
