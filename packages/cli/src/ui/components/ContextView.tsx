/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Text } from 'ink';

interface ContextViewProps {
  fullContextForView: object | null;
}

export function ContextView(props: ContextViewProps) {
  const { fullContextForView } = props;

  const replacer = (key: string, value: unknown) => {
    if (key === 'thoughtSignature') {
      return '...';
    }
    return value;
  };

  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      <Text bold>Full Context Sent to Model</Text>
      <Box marginTop={1}>
        <Text>{JSON.stringify(fullContextForView, replacer, 2)}</Text>
      </Box>
    </Box>
  );
}
