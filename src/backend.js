function getExtensionProperties(ctx) {
  return ctx.currentUser && ctx.currentUser.extensionProperties && ctx.currentUser.extensionProperties;
}

function defaultSavedBlocks() {
  return {
    summary: [],
    preconditions: [],
    steps: []
  };
}

function isSavedBlocksV2(value) {
  return (
    value &&
    typeof value === 'object' &&
    Array.isArray(value.summary) &&
    Array.isArray(value.preconditions) &&
    Array.isArray(value.steps)
  );
}

function isSavedBlocksV1(value) {
  return (
    value &&
    typeof value === 'object' &&
    Array.isArray(value.summaryChunks) &&
    typeof value.preconditions === 'string' &&
    Array.isArray(value.steps) &&
    typeof value.additionalInfo === 'string'
  );
}

function normalizeSavedBlocks(value) {
  if (isSavedBlocksV2(value)) {
    return value;
  }

  if (isSavedBlocksV1(value)) {
    return {
      summary: value.summaryChunks,
      preconditions: value.preconditions.trim() ? [value.preconditions] : [],
      steps: value.steps
    };
  }

  return null;
}

exports.httpHandler = {
  endpoints: [
    {
      method: 'GET',
      path: 'saved-blocks',
      handle: function handle(ctx) {
        const props = getExtensionProperties(ctx);

        let result;
        if (!props || !props.savedBlocks) {
          result = defaultSavedBlocks();
        } else {
          try {
            const parsed = JSON.parse(props.savedBlocks);
            const normalized = normalizeSavedBlocks(parsed);
            if (normalized) {
              result = normalized;
            } else {
              ctx.response.json({
                error: 'Saved blocks data has an unexpected format.'
              });
              return;
            }
          } catch {
            ctx.response.json({
              error: 'Failed to parse saved blocks from storage.'
            });
            return;
          }
        }

        ctx.response.json(result);
      }
    },
    {
      method: 'POST',
      path: 'saved-blocks',
      handle: function handle(ctx) {
        const payload = ctx.request.json();
        const props = getExtensionProperties(ctx);

        const normalized = normalizeSavedBlocks(payload);

        if (!normalized) {
          ctx.response.json({
            error: 'Invalid payload for saved blocks.'
          });
          return;
        }

        if (props) {
          props.savedBlocks = JSON.stringify(normalized);
        }

        ctx.response.json(normalized);
      }
    }
  ]
};
