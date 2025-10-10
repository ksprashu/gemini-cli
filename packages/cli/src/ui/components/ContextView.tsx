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

  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      <Text bold>Full Context Sent to Model</Text>
      <Box marginTop={1}>
        <Text>{JSON.stringify(fullContextForView, null, 2)}</Text>
      </Box>
    </Box>
  );
}
